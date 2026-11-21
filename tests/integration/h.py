import subprocess,json,sys,re
DB='topline1'
def run(sql, role='postgres', sub=None, email=None, expect_error=False):
    pre=''
    if role!='postgres':
        pre=f"SET LOCAL ROLE {role}; select set_config('request.jwt.claim.role','{role}',true);"
        if sub: pre+=f" select set_config('request.jwt.claim.sub','{sub}',true); select set_config('request.jwt.claim.email','{email or 'x@test.invalid'}',true);"
    full=f"BEGIN; {pre} {sql}; COMMIT;"
    p=subprocess.run(['su','postgres','-c',f"psql -d {DB} -At -v ON_ERROR_STOP=1"],input=full,capture_output=True,text=True)
    out=(p.stdout or '').strip(); err=(p.stderr or '').strip()
    return p.returncode, out, err
results=[]
def check(name, cond, detail=''):
    results.append((name,bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+('' if cond else f'   -> {detail}'))
def last(out):  # last non-empty line of psql output (the SELECT result), ignoring set_config noise
    lines=[l for l in out.split('\n') if l.strip() and l not in('BEGIN','COMMIT','SET')]
    return lines
