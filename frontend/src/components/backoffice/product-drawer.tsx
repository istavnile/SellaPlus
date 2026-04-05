'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, X, Loader2, Trash2 } from 'lucide-react';
import { apiClient, uploadFile, getImageUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { useCurrency } from '@/hooks/useCurrency';
import { compressImage } from '@/lib/utils/compress-image';

// ─── Constants ────────────────────────────────────────────────────────────────

const POS_COLORS = [
  '#e5e7eb', '#ef4444', '#ec4899', '#f97316',
  '#a3e635', '#22c55e', '#3b82f6', '#a855f7',
];

const POS_SHAPES = [
  { id: 'square',  label: 'Cuadrado' },
  { id: 'circle',  label: 'Círculo' },
  { id: 'stamp',   label: 'Sello' },
  { id: 'hexagon', label: 'Hexágono' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  name:   z.string().min(1),
  values: z.string().min(1),
});

const productSchema = z.object({
  name:                z.string().min(1, 'El nombre es requerido'),
  description:         z.string().optional(),
  sku:                 z.string().optional(),
  barcode:             z.string().optional(),
  sellBy:              z.enum(['UNIT', 'WEIGHT']),
  costPrice:           z.coerce.number().min(0),
  basePrice:           z.coerce.number().min(0, 'El precio es requerido'),
  trackStock:          z.boolean(),
  stockAlertThreshold: z.coerce.number().min(0).optional(),
  options:             z.array(optionSchema).max(3).optional(),
  posRepresentation:   z.enum(['color_shape', 'image']),
  posColor:            z.string(),
  posShape:            z.string(),
  categoryId:          z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

// ─── Shape SVG ────────────────────────────────────────────────────────────────

function ShapePreview({ shape, color, size = 44 }: { shape: string; color: string; size?: number }) {
  const s = size;
  if (shape === 'circle') return <svg width={s} height={s} viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill={color} /></svg>;
  if (shape === 'stamp') {
    const pts = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; const r = i % 2 === 0 ? 20 : 15; return `${22 + r * Math.cos(a)},${22 + r * Math.sin(a)}`; }).join(' ');
    return <svg width={s} height={s} viewBox="0 0 44 44"><polygon points={pts} fill={color} /></svg>;
  }
  if (shape === 'hexagon') {
    const pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 6; return `${22 + 20 * Math.cos(a)},${22 + 20 * Math.sin(a)}`; }).join(' ');
    return <svg width={s} height={s} viewBox="0 0 44 44"><polygon points={pts} fill={color} /></svg>;
  }
  return <svg width={s} height={s} viewBox="0 0 44 44"><rect x="2" y="2" width="40" height="40" rx="6" fill={color} /></svg>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductDrawerProps {
  /** null = create mode; string = edit mode with that product id */
  productId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: { id: string; name: string }[];
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export function ProductDrawer({ productId, open, onClose, onSaved, categories }: ProductDrawerProps) {
  const { symbol } = useCurrency();
  const isEdit = !!productId;

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, control, setValue, reset, formState: { errors } } =
    useForm<ProductForm>({
      resolver: zodResolver(productSchema),
      defaultValues: {
        sellBy: 'UNIT', trackStock: true, costPrice: 0, basePrice: 0,
        stockAlertThreshold: 5, options: [],
        posRepresentation: 'color_shape', posColor: '#e5e7eb', posShape: 'square',
      },
    });

  const { fields: optionFields, append: appendOption, remove: removeOption } =
    useFieldArray({ control, name: 'options' });

  const trackStock        = watch('trackStock');
  const posColor          = watch('posColor');
  const posShape          = watch('posShape');
  const posRepresentation = watch('posRepresentation');

  // ── Load product data when opening in edit mode ──────────────────────────

  useEffect(() => {
    if (!open) return;

    // Scroll drawer to top
    scrollRef.current?.scrollTo(0, 0);

    if (!isEdit) {
      // Create mode: reset to defaults
      reset({
        sellBy: 'UNIT', trackStock: true, costPrice: 0, basePrice: 0,
        stockAlertThreshold: 5, options: [],
        posRepresentation: 'color_shape', posColor: '#e5e7eb', posShape: 'square',
        categoryId: '',
      });
      setImagePreview(null);
      return;
    }

    // Edit mode: fetch product
    setLoadingData(true);
    apiClient.get(`/products/${productId}`)
      .then((r) => {
        const p = r.data;
        if (p.images?.[0]?.url) setImagePreview(p.images[0].url);
        else setImagePreview(null);
        reset({
          name:                p.name ?? '',
          description:         p.description ?? '',
          sku:                 p.sku ?? '',
          barcode:             p.barcode ?? '',
          sellBy:              p.sellBy ?? 'UNIT',
          costPrice:           Number(p.costPrice ?? 0),
          basePrice:           Number(p.basePrice ?? 0),
          trackStock:          p.trackStock ?? true,
          stockAlertThreshold: p.stockAlertThreshold ?? 5,
          options:             [],
          posRepresentation:   p.posRepresentation ?? 'color_shape',
          posColor:            p.posColor ?? '#e5e7eb',
          posShape:            p.posShape ?? 'square',
          categoryId:          p.categoryId ?? '',
        });
      })
      .catch(() => toast.error('No se pudo cargar el producto'))
      .finally(() => setLoadingData(false));
  }, [open, productId, isEdit, reset]);

  // ── Close on Escape ────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    try {
      let finalImageUrl = imagePreview;
      if (imagePreview && imagePreview.startsWith('data:')) {
        const res  = await fetch(imagePreview);
        const blob = await res.blob();
        const file = new File([blob], 'product.jpg', { type: 'image/jpeg' });
        const upRes = await uploadFile(file);
        finalImageUrl = upRes.data.url;
      }

      const payload = {
        ...data,
        categoryId: data.categoryId || null,
        ...(finalImageUrl !== undefined ? { images: finalImageUrl ? [{ url: finalImageUrl }] : [] } : {}),
        options: data.options
          ?.filter((o) => o.name && o.values)
          .map((o) => ({ name: o.name, values: o.values.split(',').map((v) => v.trim()).filter(Boolean) })),
      };

      if (isEdit) {
        await apiClient.patch(`/products/${productId}`, payload);
        toast.success('Producto actualizado');
      } else {
        await apiClient.post('/products', payload);
        toast.success('Producto creado');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirm('¿Desactivar este producto? Dejará de aparecer en el catálogo.')) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/products/${productId}`);
      toast.success('Producto desactivado');
      onSaved();
      onClose();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Desactivar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <form id="product-drawer-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

              {/* ── Información básica ──────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">Información básica</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input {...register('name')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white" placeholder="Ej: Camiseta Básica" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea {...register('description')} rows={2} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none text-sm bg-white" placeholder="Descripción opcional..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select {...register('categoryId')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-sm">
                    <option value="">Sin categoría</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
                    <input {...register('sku')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white" placeholder="Auto" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
                    <input {...register('barcode')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white" placeholder="Auto" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de venta</label>
                  <select {...register('sellBy')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-sm">
                    <option value="UNIT">Por unidad</option>
                    <option value="WEIGHT">Por peso</option>
                  </select>
                </div>
              </div>

              {/* ── Precios ─────────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">Precios</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{symbol}</span>
                      <input {...register('costPrice')} type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{symbol}</span>
                      <input {...register('basePrice')} type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white" placeholder="0.00" />
                    </div>
                    {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice.message}</p>}
                  </div>
                </div>
              </div>

              {/* ── Inventario ───────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">Inventario</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input {...register('trackStock')} type="checkbox" className="w-4 h-4 accent-brand-600" />
                  <span className="text-sm text-gray-700">Controlar stock de este producto</span>
                </label>
                {trackStock && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alerta de stock bajo (unidades)</label>
                    <input {...register('stockAlertThreshold')} type="number" min="0" className="w-32 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white" placeholder="5" />
                  </div>
                )}
              </div>

              {/* ── Variantes ───────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">Variantes</h3>
                <p className="text-xs text-gray-500">
                  {isEdit ? 'Agrega nuevas variantes aquí. Las variantes existentes no se modificarán.' : 'Usa variantes si el producto tiene diferentes tamaños, colores u otras opciones.'}
                </p>

                {optionFields.map((field, idx) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Opción {idx + 1}</span>
                      <button type="button" onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                    <input {...register(`options.${idx}.name`)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" placeholder="Nombre (ej: Talla)" />
                    <input {...register(`options.${idx}.values`)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" placeholder="Valores separados por coma (ej: S, M, L)" />
                  </div>
                ))}

                {optionFields.length < 3 && (
                  <button type="button" onClick={() => appendOption({ name: '', values: '' })} className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    <Plus size={18} className="border-2 border-brand-600 rounded-full" />
                    Nueva variante
                  </button>
                )}
              </div>

              {/* ── Representación TPV ──────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">Representación en el TPV</h3>

                <div className="flex items-center gap-6">
                  {(['color_shape', 'image'] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={mode} checked={posRepresentation === mode} onChange={() => setValue('posRepresentation', mode)} className="accent-brand-600 w-4 h-4" />
                      <span className="text-sm text-gray-700">{mode === 'color_shape' ? 'Color y forma' : 'Imagen'}</span>
                    </label>
                  ))}
                </div>

                {posRepresentation === 'color_shape' && (
                  <div className="flex gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {POS_COLORS.map((color) => (
                          <button key={color} type="button" onClick={() => setValue('posColor', color)}
                            className={cn('w-10 h-10 rounded-md transition-all', posColor === color && 'ring-2 ring-offset-2 ring-gray-500')}
                            style={{ backgroundColor: color }}>
                            {posColor === color && <span className="flex items-center justify-center text-white text-base font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {POS_SHAPES.map(({ id: shapeId }) => (
                          <button key={shapeId} type="button" onClick={() => setValue('posShape', shapeId)}
                            className={cn('w-10 h-10 flex items-center justify-center rounded-md border-2 transition-all', posShape === shapeId ? 'border-gray-500' : 'border-gray-200 hover:border-gray-300')}>
                            <ShapePreview shape={shapeId} color={posShape === shapeId ? '#374151' : '#d1d5db'} size={26} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-xl border border-gray-200 flex items-center justify-center bg-white">
                        <ShapePreview shape={posShape} color={posColor} size={64} />
                      </div>
                      <span className="text-xs text-gray-400">Vista previa</span>
                    </div>
                  </div>
                )}

                {posRepresentation === 'image' && (
                  <div className="flex gap-6">
                    <div className="flex-1">
                      <label className="w-28 h-28 bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors relative overflow-hidden group">
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) { toast.error('La imagen no puede superar los 10 MB'); e.target.value = ''; return; }
                          try {
                            const compressed = await compressImage(file);
                            setImagePreview(compressed);
                          } catch { toast.error('Error al procesar la imagen'); }
                        }} />
                        {imagePreview ? (
                          <img src={getImageUrl(imagePreview)!} className="w-full h-full object-contain" alt="Vista previa" />
                        ) : (
                          <span className="text-xs font-medium text-gray-500 text-center px-2">Subir imagen</span>
                        )}
                        {imagePreview && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">Cambiar</span>
                          </div>
                        )}
                      </label>
                      <p className="mt-2 text-xs text-gray-500">Se ajustará automáticamente sin deformarse.</p>
                      {imagePreview && (
                        <button type="button" onClick={() => setImagePreview(null)} className="mt-1.5 text-sm text-red-500 hover:text-red-700">
                          Eliminar imagen
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-xl border border-gray-200 flex items-center justify-center bg-white shadow-sm overflow-hidden p-1">
                        {imagePreview ? (
                          <img src={getImageUrl(imagePreview)!} className="w-full h-full object-contain" alt="Vista previa POS" />
                        ) : (
                          <span className="text-xs text-gray-400 text-center">Sin imagen</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">Vista previa TPV</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Spacer for sticky footer */}
              <div className="h-2" />
            </form>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-white flex items-center gap-3">
          <button
            type="submit"
            form="product-drawer-form"
            disabled={saving || loadingData}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Guardando...</span> : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
