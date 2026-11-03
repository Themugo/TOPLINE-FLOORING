import { useBrand } from '@/hooks/use-brand';
import type { Brand } from '@/lib/brand';

/**
 * Logo + wordmark + descriptor, driven by the brand set in Admin > Site Settings.
 * One component for header and footer so a brand change shows everywhere at once.
 */
export function BrandLockup({ variant, brand: override }: { variant: 'header' | 'footer'; brand?: Brand }) {
  const live = useBrand();
  const brand = override ?? live;
  const header = variant === 'header';

  const imgClass = brand.customLogo
    ? header
      ? `h-9 sm:h-12 lg:h-[3.35rem] w-auto ${brand.showText ? 'max-w-[7rem] sm:max-w-[9rem]' : 'max-w-[11rem] sm:max-w-[14rem]'} shrink-0 object-contain`
      : `h-10 sm:h-12 w-auto ${brand.showText ? 'max-w-[9rem]' : 'max-w-[14rem]'} shrink-0 object-contain`
    : header
      ? 'h-9 w-9 sm:h-12 sm:w-[3.35rem] lg:h-[3.35rem] lg:w-[3.75rem] shrink-0 object-contain transition-transform duration-200 group-hover:scale-[1.03]'
      : 'h-10 w-10 sm:h-12 sm:w-[3.35rem] shrink-0 object-contain';

  return (
    <>
      <img
        src={brand.logoUrl}
        alt=""
        aria-hidden="true"
        className={imgClass}
        {...(brand.customLogo ? {} : { width: 72, height: 64 })}
      />
      {brand.showText && (
        <span className="min-w-0 flex flex-col justify-center">
          <span className={`block font-display font-extrabold leading-[0.98] tracking-[-0.045em] text-[#0C2D57] ${header ? 'text-[19px] sm:text-[21px] lg:text-[23px]' : 'text-[19px] sm:text-[21px]'}`}>{brand.wordmark}</span>
          {brand.descriptor && (
            <span className={`mt-1 block whitespace-nowrap font-extrabold leading-tight tracking-[0.005em] sm:tracking-[0.045em] text-[#0C2D57] ${header ? 'text-[7px] sm:text-[9px] lg:text-[10px]' : 'text-[7px] sm:text-[9px]'}`}>{brand.descriptor}</span>
          )}
          {brand.promise && header && (
            <>
              <span className="mt-1 hidden lg:block whitespace-nowrap text-[9px] font-medium leading-tight tracking-[0.13em] text-slate-500">{brand.promise}</span>
              <span className="mt-1 hidden sm:block lg:hidden text-[8px] font-semibold leading-tight tracking-[0.06em] text-slate-500">{brand.promise}</span>
            </>
          )}
          {brand.promise && !header && (
            <span className="mt-1 hidden sm:block text-[8px] font-semibold leading-tight tracking-[0.06em] text-slate-500">{brand.promise}</span>
          )}
        </span>
      )}
    </>
  );
}
