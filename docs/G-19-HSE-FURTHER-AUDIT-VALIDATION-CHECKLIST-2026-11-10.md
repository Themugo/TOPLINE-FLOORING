# G-19 Further Audit — Validation Checklist

## Disposable database validation

- [ ] Replay all 168 migrations in timestamp order against a new disposable PostgreSQL/Supabase database.
- [ ] Confirm the latest HSE migration applies without manual edits.
- [ ] Confirm `get_hse_site_compliance_360()` returns site owner, emergency notes, PPE, event immediate-control, action owner, verifier and verification notes.
- [ ] Confirm inactive/non-staff site owners are rejected.
- [ ] Confirm inactive/non-staff corrective-action owners are rejected.
- [ ] Confirm past or current corrective-action due dates are rejected.
- [ ] Confirm invalid project references are rejected.
- [ ] Confirm anon cannot execute the HSE RPCs and authorized staff can.
- [ ] Confirm unauthorized staff without `projects:update` cannot mutate HSE records and users without `projects:select` cannot read the snapshot.

## Workflow regression

- [ ] Create site control with active safety owner, PPE or N/A reason, emergency arrangements and future review date.
- [ ] Create hazard, near-miss and incident records.
- [ ] Verify incident/high/critical immediate-control evidence is mandatory and visible in the dashboard.
- [ ] Create corrective action with active owner and future due date.
- [ ] Verify action completion by owner and independent verification by a different authorized staff member.
- [ ] Verify resolved event can close only after every action is closed.
- [ ] Verify terminal events/actions cannot be reopened.

## Real-site evidence

- [ ] Competent person completes and signs site risk assessment/JSA.
- [ ] Worker induction and toolbox talk attendance recorded.
- [ ] PPE issuance, suitability and observed compliance checked.
- [ ] Equipment inspection and permits-to-work checked where applicable.
- [ ] Emergency contacts, assembly point, first aid and evacuation arrangements physically verified.
- [ ] Incidents/near misses and corrective actions sampled against actual site records.
- [ ] Worker consultation and corrective-action closeout independently sampled.
- [ ] Competent HSE reviewer signs the site certification record.

Do not mark any item complete without dated evidence and the responsible person's identity. Do not upload identity documents, medical records or other unnecessary sensitive data into free-text evidence references.
