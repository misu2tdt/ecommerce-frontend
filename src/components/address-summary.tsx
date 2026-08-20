import type { Address } from "@/types/address";

export function AddressSummary({ address }: { address: Address }) {
  const locality = [
    address.ward,
    address.district,
    address.city,
    address.stateProvince,
  ].filter(Boolean);

  return (
    <div className="text-sm leading-6 text-slate-600">
      <p className="font-semibold text-slate-950">
        {address.recipientName} · {address.phone}
      </p>
      <p>{address.addressLine1}</p>
      {address.addressLine2 && <p>{address.addressLine2}</p>}
      <p>{locality.join(", ")}</p>
      <p>
        {[address.postalCode, address.countryCode].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
