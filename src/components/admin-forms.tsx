"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteImageAction,
  deleteNamedCatalogAction,
  deleteProductAction,
  deleteVariantAction,
  saveNamedCatalogAction,
  saveProductAction,
  saveVariantAction,
  updateImageAction,
  uploadImageAction,
  type AdminActionState,
} from "@/features/admin/actions";
import { formatVnd } from "@/lib/money";
import type { AdminProduct, AdminProductVariant } from "@/types/admin";
import type { Brand, Category, ProductImage } from "@/types/catalog";

import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const INITIAL_STATE: AdminActionState = {};
const inputClass = "mt-2 min-h-11 w-full rounded-md border border-field-border bg-surface px-3 text-brand-strong outline-none transition focus:border-brand focus:ring-2 focus:ring-brand";
const labelClass = "text-body-sm font-semibold text-neutral-800";

export function NamedCatalogManager({ resource, items }: { resource: "category" | "brand"; items: Array<Category | Brand> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="text-title font-bold text-brand-strong">Create {resource}</h2>
        <NamedCatalogForm resource={resource} mode="create" />
      </section>
      <section className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-field-border bg-surface p-8 text-center text-neutral-600">No {resource}s yet.</div>
        ) : items.map((item) => <NamedCatalogEditor key={item.id} resource={resource} item={item} />)}
      </section>
    </div>
  );
}

function NamedCatalogEditor({ resource, item }: { resource: "category" | "brand"; item: Category | Brand }) {
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="cursor-pointer list-none p-5 focus-visible:outline-2 focus-visible:outline-brand">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-bold text-brand-strong">{item.name}</h2><p className="mt-1 text-body-sm text-neutral-600">/{item.slug}</p></div>
          <span className="text-body-sm font-semibold text-brand group-open:hidden">Edit</span>
        </div>
      </summary>
      <div className="border-t border-line p-5">
        <NamedCatalogForm resource={resource} mode="edit" item={item} />
        <DeleteForm action={deleteNamedCatalogAction} label={`Delete ${resource}`} confirmMessage={`Delete ${item.name}? This cannot be undone.`} hidden={{ resource, id: item.id, returnPath: `/admin/${resource === "category" ? "categories" : "brands"}` }} />
      </div>
    </details>
  );
}

function NamedCatalogForm({ resource, mode, item }: { resource: "category" | "brand"; mode: "create" | "edit"; item?: Category | Brand }) {
  const [state, action] = useActionState(saveNamedCatalogAction, INITIAL_STATE);
  return (
    <form action={action} className="mt-5 space-y-4">
      <Hidden values={{ resource, mode, id: item?.id ?? "", returnPath: `/admin/${resource === "category" ? "categories" : "brands"}` }} />
      <Field label="Name" name="name" defaultValue={item?.name} maxLength={255} required />
      <TextArea label="Description" name="description" defaultValue={item?.description ?? ""} maxLength={2000} />
      {item && <p className="text-body-sm text-neutral-600">Slug is generated on creation and remains stable when the name changes.</p>}
      <ActionMessage state={state} />
      <SubmitButton idle={mode === "create" ? `Create ${resource}` : "Save changes"} pending="Saving..." />
    </form>
  );
}

export function ProductForm({ categories, brands, product }: { categories: Category[]; brands: Brand[]; product?: AdminProduct }) {
  const [state, action] = useActionState(saveProductAction, INITIAL_STATE);
  const returnPath = product ? `/admin/products/${product.id}` : "/admin/products/new";
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Hidden values={{ mode: product ? "edit" : "create", id: product?.id ?? "", returnPath }} />
      <Field label="Product name" name="name" defaultValue={product?.name} required className="sm:col-span-2" />
      <TextArea label="Description" name="description" defaultValue={product?.description ?? ""} className="sm:col-span-2" />
      <SelectField label="Category" name="categoryId" defaultValue={product?.categoryId} required options={categories.map((item) => ({ value: item.id, label: item.name }))} />
      <SelectField label="Brand" name="brandId" defaultValue={product?.brandId ?? ""} options={[{ value: "", label: "No brand" }, ...brands.map((item) => ({ value: item.id, label: item.name }))]} />
      <SelectField label="Status" name="status" defaultValue={product?.status ?? "active"} required options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      {product && <div className="self-end rounded-md bg-surface-muted px-4 py-3 text-body-sm text-neutral-600">Stable slug: <span className="font-semibold text-brand">/{product.slug}</span></div>}
      <div className="sm:col-span-2"><ActionMessage state={state} />{state.entityId && !product && <Link href={`/admin/products/${state.entityId}`} className="mb-4 inline-block font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand">Manage its Variants and images</Link>}<SubmitButton idle={product ? "Save Product" : "Create Product"} pending="Saving Product..." /></div>
    </form>
  );
}

export function ProductDelete({ product }: { product: AdminProduct }) {
  return <DeleteForm action={deleteProductAction} label="Delete Product" confirmMessage={`Delete ${product.name} and its Variants and images? This cannot be undone.`} hidden={{ id: product.id, returnPath: `/admin/products/${product.id}` }} />;
}

export function VariantManager({ product }: { product: AdminProduct }) {
  return (
    <div className="space-y-5">
      <details className="rounded-md border border-dashed border-line bg-brand-soft p-5">
        <summary className="cursor-pointer font-bold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand">Add Variant</summary>
        <VariantForm productId={product.id} mode="create" />
      </details>
      {product.variants.length === 0 ? <p className="rounded-md bg-surface-muted p-5 text-neutral-600">No purchasable SKUs yet.</p> : product.variants.map((variant) => <VariantEditor key={variant.id} productId={product.id} variant={variant} />)}
    </div>
  );
}

function VariantEditor({ productId, variant }: { productId: number; variant: AdminProductVariant }) {
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="cursor-pointer list-none p-4 focus-visible:outline-2 focus-visible:outline-brand">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-brand-strong">{variant.name}</p><p className="mt-1 text-body-sm text-neutral-600">{variant.sku} · {formatVnd(variant.price)} · Stock {variant.stock}</p></div><StatusBadge active={variant.isActive} /></div>
      </summary>
      <div className="border-t border-line p-5"><VariantForm productId={productId} mode="edit" variant={variant} /><p className="mt-3 text-body-sm text-neutral-600">SKU is immutable after creation.</p><DeleteForm action={deleteVariantAction} label="Delete Variant" confirmMessage={`Delete Variant ${variant.sku}? This cannot be undone.`} hidden={{ productId, variantId: variant.id, returnPath: `/admin/products/${productId}` }} /></div>
    </details>
  );
}

function VariantForm({ productId, mode, variant }: { productId: number; mode: "create" | "edit"; variant?: AdminProductVariant }) {
  const [state, action] = useActionState(saveVariantAction, INITIAL_STATE);
  return (
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Hidden values={{ productId, variantId: variant?.id ?? "", mode, returnPath: `/admin/products/${productId}` }} />
      {mode === "create" && <Field label="SKU" name="sku" maxLength={64} required />}
      <Field label="Variant name" name="name" defaultValue={variant?.name} maxLength={255} required />
      <Field label="Price (integer VND)" name="price" type="number" min={0} step={1} defaultValue={variant?.price} required />
      <Field label="Stock" name="stock" type="number" min={0} step={1} defaultValue={variant?.stock ?? 0} required />
      <Field label="Position" name="position" type="number" min={0} step={1} defaultValue={variant?.position ?? 0} required />
      <label className="flex min-h-11 items-center gap-3 self-end rounded-md border border-line px-4 py-3"><input type="checkbox" name="isActive" defaultChecked={variant?.isActive ?? true} className="h-5 w-5 accent-brand" /><span className={labelClass}>Active SKU</span></label>
      <div className="sm:col-span-2"><AttributeEditor initial={variant?.attributes ?? {}} /></div>
      <div className="sm:col-span-2"><ActionMessage state={state} /><SubmitButton idle={mode === "create" ? "Create Variant" : "Save Variant"} pending="Saving Variant..." /></div>
    </form>
  );
}

function AttributeEditor({ initial }: { initial: Record<string, string> }) {
  const [rows, setRows] = useState(() => Object.entries(initial).map(([key, value], index) => ({ id: index, key, value })));
  const serialized = JSON.stringify(Object.fromEntries(rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])));
  return (
    <fieldset><legend className={labelClass}>Attributes</legend><p className="mt-1 text-body-sm text-neutral-600">Flexible key/value metadata such as material, size, or capacity.</p><input type="hidden" name="attributes" value={serialized} />
      <div className="mt-3 space-y-2">{rows.map((row) => <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label="Attribute key" value={row.key} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, key: event.target.value } : item))} className={inputClass.replace("mt-2 ", "")} /><input aria-label="Attribute value" value={row.value} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))} className={inputClass.replace("mt-2 ", "")} /><button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="min-h-11 rounded-md border border-field-border px-3 text-body-sm font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand">Remove</button></div>)}</div>
      <button type="button" onClick={() => setRows((current) => [...current, { id: Math.max(-1, ...current.map((item) => item.id)) + 1, key: "", value: "" }])} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>Add attribute</button>
    </fieldset>
  );
}

export function ImageManager({ product }: { product: AdminProduct }) {
  return (
    <div className="space-y-5">
      <ImageUploadForm productId={product.id} />
      {product.images.length === 0 ? <p className="rounded-md bg-surface-muted p-5 text-neutral-600">No images uploaded.</p> : <div className="grid gap-4 lg:grid-cols-2">{product.images.map((image) => <ImageEditor key={image.id} productId={product.id} productName={product.name} image={image} />)}</div>}
    </div>
  );
}

function ImageUploadForm({ productId }: { productId: number }) {
  const [state, action] = useActionState(uploadImageAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") formRef.current?.reset(); }, [state.status]);
  return (
    <form ref={formRef} action={action} className="grid gap-4 rounded-md border border-dashed border-line bg-brand-soft p-5 sm:grid-cols-2">
      <Hidden values={{ productId, returnPath: `/admin/products/${productId}` }} />
      <Field label="Image file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="sm:col-span-2" />
      <Field label="Alt text" name="altText" maxLength={255} />
      <Field label="Position" name="position" type="number" min={0} step={1} defaultValue={0} required />
      <label className="flex min-h-11 items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 sm:col-span-2"><input type="checkbox" name="isPrimary" className="h-5 w-5 accent-brand" /><span className={labelClass}>Set as primary image</span></label>
      <div className="sm:col-span-2"><p className="mb-3 text-body-sm text-neutral-600">JPEG, PNG, or WebP; maximum 5 MB. Upload goes through the authenticated backend.</p><ActionMessage state={state} /><SubmitButton idle="Upload image" pending="Uploading..." /></div>
    </form>
  );
}

function ImageEditor({ productId, productName, image }: { productId: number; productName: string; image: ProductImage }) {
  const [state, action] = useActionState(updateImageAction, INITIAL_STATE);
  return (
    <article className="overflow-hidden rounded-md border border-line bg-surface"><div className="relative aspect-[4/3] bg-brand-soft"><Image src={image.url} alt={image.altText || productName} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain" /></div><form action={action} className="grid gap-4 p-4 sm:grid-cols-2"><Hidden values={{ productId, imageId: image.id, returnPath: `/admin/products/${productId}` }} /><Field label="Alt text" name="altText" defaultValue={image.altText ?? ""} maxLength={255} className="sm:col-span-2" /><Field label="Position" name="position" type="number" min={0} step={1} defaultValue={image.position} required /><label className="flex min-h-11 items-center gap-3 self-end rounded-md border border-line px-4 py-3"><input type="checkbox" name="isPrimary" defaultChecked={image.isPrimary} className="h-5 w-5 accent-brand" /><span className={labelClass}>Primary</span></label><div className="sm:col-span-2"><ActionMessage state={state} /><SubmitButton idle="Save image metadata" pending="Saving..." /></div></form><div className="px-4 pb-4"><DeleteForm action={deleteImageAction} label="Delete image" confirmMessage="Delete this image from the Product? This cannot be undone." hidden={{ productId, imageId: image.id, returnPath: `/admin/products/${productId}` }} /></div></article>
  );
}

function DeleteForm({ action, label, confirmMessage, hidden }: { action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>; label: string; confirmMessage: string; hidden: Record<string, string | number> }) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  return <form action={formAction} onSubmit={(event) => { if (!window.confirm(confirmMessage)) event.preventDefault(); }} className="mt-5 border-t border-line pt-4"><Hidden values={hidden} /><ActionMessage state={state} /><SubmitButton idle={label} pending="Deleting..." destructive /></form>;
}

function SubmitButton({ idle, pending, destructive = false }: { idle: string; pending: string; destructive?: boolean }) {
  const status = useFormStatus();
  return <button type="submit" disabled={status.pending} className={`min-h-11 rounded-md px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${destructive ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-800" : "bg-brand hover:bg-brand-strong focus-visible:outline-brand"}`}>{status.pending ? pending : idle}</button>;
}

function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`mb-4 rounded-md border px-4 py-3 text-body-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-success/30 bg-success-soft text-success"}`}>{state.message}</p>;
}

function Hidden({ values }: { values: Record<string, string | number> }) { return <>{Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}</>; }
function Field({ label, className = "", ...props }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) { const id = useId(); return <div className={className}><label htmlFor={id} className={labelClass}>{label}</label><input {...props} id={id} className={inputClass} /></div>; }
function TextArea({ label, className = "", ...props }: { label: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) { const id = useId(); return <div className={className}><label htmlFor={id} className={labelClass}>{label}</label><textarea {...props} id={id} rows={4} className={`${inputClass} py-3`} /></div>; }
function SelectField({ label, options, ...props }: { label: string; options: Array<{ value: string | number; label: string }> } & React.SelectHTMLAttributes<HTMLSelectElement>) { const id = useId(); return <div><label htmlFor={id} className={labelClass}>{label}</label><select {...props} id={id} className={inputClass}>{options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select></div>; }
function StatusBadge({ active }: { active: boolean }) { return <Badge variant={active ? "success" : "neutral"} className="uppercase tracking-eyebrow">{active ? "Active" : "Inactive"}</Badge>; }
