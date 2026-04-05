'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { apiClient, uploadFile, getImageUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { useCurrency } from '@/hooks/useCurrency';
import { compressImage } from '@/lib/utils/compress-image';

// ─── Constantes de TPV ────────────────────────────────────────────────────────

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
  name: z.string().min(1),
  values: z.string().min(1), // CSV "S, M, L"
});

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  sellBy: z.enum(['UNIT', 'WEIGHT']),
  costPrice: z.coerce.number().min(0),
  basePrice: z.coerce.number().min(0, 'El precio es requerido'),
  trackStock: z.boolean(),
  stockAlertThreshold: z.coerce.number().min(0).optional(),
  options: z.array(optionSchema).max(3).optional(),
  posRepresentation: z.enum(['color_shape', 'image']),
  posColor: z.string(),
  posShape: z.string(),
});

type ProductForm = z.infer<typeof productSchema>;

// ─── Componente de forma SVG ──────────────────────────────────────────────────

function ShapePreview({ shape, color, size = 44 }: { shape: string; color: string; size?: number }) {
  const s = size;
  if (shape === 'circle') {
    return (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill={color} />
      </svg>
    );
  }
  if (shape === 'stamp') {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? 20 : 15;
      return `${22 + r * Math.cos(a)},${22 + r * Math.sin(a)}`;
    }).join(' ');
    return (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <polygon points={pts} fill={color} />
      </svg>
    );
  }
  if (shape === 'hexagon') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      return `${22 + 20 * Math.cos(a)},${22 + 20 * Math.sin(a)}`;
    }).join(' ');
    return (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <polygon points={pts} fill={color} />
      </svg>
    );
  }
  // square (default)
  return (
    <svg width={s} height={s} viewBox="0 0 44 44">
      <rect x="2" y="2" width="40" height="40" rx="6" fill={color} />
    </svg>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter();
  const { symbol } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } =
    useForm<ProductForm>({
      resolver: zodResolver(productSchema),
      defaultValues: {
        sellBy: 'UNIT',
        trackStock: true,
        costPrice: 0,
        basePrice: 0,
        stockAlertThreshold: 5,
        options: [],
        posRepresentation: 'color_shape',
        posColor: '#e5e7eb',
        posShape: 'square',
      },
    });

  const { fields: optionFields, append: appendOption, remove: removeOption } =
    useFieldArray({ control, name: 'options' });

  const trackStock      = watch('trackStock');
  const posColor        = watch('posColor');
  const posShape        = watch('posShape');
  const posRepresentation = watch('posRepresentation');

  const onSubmit = async (data: ProductForm) => {
    setLoading(true);
    try {
      let finalImageUrl = imagePreview;
      if (imagePreview && imagePreview.startsWith('data:')) {
        const res = await fetch(imagePreview);
        const blob = await res.blob();
        const file = new File([blob], 'product.jpg', { type: 'image/jpeg' });
        const upRes = await uploadFile(file);
        finalImageUrl = upRes.data.url;
      }

      const payload = {
        ...data,
        categoryId: (data as any).categoryId || null,
        ...(finalImageUrl ? { images: [{ url: finalImageUrl }] } : {}),
        options: data.options
          ?.filter((o) => o.name && o.values)
          .map((o) => ({
            name: o.name,
            values: o.values.split(',').map((v) => v.trim()).filter(Boolean),
          })),
      };
      await apiClient.post('/products', payload);
      toast.success('Producto creado exitosamente');
      router.push('/products');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/products" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Productos
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Información básica ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Información básica</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              {...register('name')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ej: Camiseta Básica"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Descripción opcional..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
              <input {...register('sku')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Se generará automáticamente" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
              <input {...register('barcode')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Se generará automáticamente" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de venta</label>
            <select {...register('sellBy')} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="UNIT">Por unidad</option>
              <option value="WEIGHT">Por peso</option>
            </select>
          </div>
        </div>

        {/* ── Precios ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Precios</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{symbol}</span>
                <input {...register('costPrice')} type="number" step="0.01" min="0"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{symbol}</span>
                <input {...register('basePrice')} type="number" step="0.01" min="0"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0.00" />
              </div>
              {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice.message}</p>}
            </div>
          </div>
        </div>

        {/* ── Inventario ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Inventario</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('trackStock')} type="checkbox" className="w-4 h-4 accent-brand-600" />
            <span className="text-sm text-gray-700">Controlar stock de este producto</span>
          </label>
          {trackStock && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alerta de stock bajo (unidades)</label>
              <input {...register('stockAlertThreshold')} type="number" min="0"
                className="w-40 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="5" />
            </div>
          )}
        </div>

        {/* ── Variantes ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Variantes</h2>
          <p className="text-sm text-gray-500">
            Usa variantes si el producto tiene diferentes tamaños, colores u otras opciones
          </p>

          {optionFields.map((field, idx) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Opción {idx + 1}</span>
                <button type="button" onClick={() => removeOption(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div>
                <input
                  {...register(`options.${idx}.name`)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Nombre de la opción (ej: Talla, Color)"
                />
              </div>
              <div>
                <input
                  {...register(`options.${idx}.values`)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Valores separados por coma (ej: S, M, L, XL)"
                />
                <p className="text-xs text-gray-400 mt-1">Separa los valores con comas</p>
              </div>
            </div>
          ))}

          {optionFields.length < 3 && (
            <button
              type="button"
              onClick={() => appendOption({ name: '', values: '' })}
              className="flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
            >
              <Plus size={18} className="border-2 border-green-600 rounded-full" />
              AÑADIR VARIANTE
            </button>
          )}
        </div>

        {/* ── Representación en el TPV ───────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-700">Representación en el TPV</h2>

          {/* Selector de modo */}
          <div className="flex items-center gap-6">
            {(['color_shape', 'image'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={mode}
                  checked={posRepresentation === mode}
                  onChange={() => setValue('posRepresentation', mode)}
                  className="accent-green-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  {mode === 'color_shape' ? 'Color y forma' : 'Imagen'}
                </span>
              </label>
            ))}
          </div>

          {posRepresentation === 'color_shape' && (
            <div className="flex gap-6">
              {/* Izquierda: paleta de colores + formas */}
              <div className="space-y-4 flex-1">
                {/* Paleta de colores */}
                <div className="flex flex-wrap gap-2">
                  {POS_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('posColor', color)}
                      className={cn(
                        'w-11 h-11 rounded-md transition-all',
                        posColor === color && 'ring-2 ring-offset-2 ring-gray-500'
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {posColor === color && (
                        <span className="flex items-center justify-center text-white text-lg font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selector de forma */}
                <div className="flex gap-2">
                  {POS_SHAPES.map(({ id }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setValue('posShape', id)}
                      className={cn(
                        'w-11 h-11 flex items-center justify-center rounded-md border-2 transition-all',
                        posShape === id ? 'border-gray-500' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <ShapePreview shape={id} color={posShape === id ? '#374151' : '#d1d5db'} size={28} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Derecha: preview */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50">
                  <ShapePreview shape={posShape} color={posColor} size={72} />
                </div>
                <span className="text-xs text-gray-400">Vista previa</span>
              </div>
            </div>
          )}

          {posRepresentation === 'image' && (
            <div className="flex gap-6">
              <div className="flex-1">
                <label className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors relative overflow-hidden group">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('La imagen no puede superar los 10 MB');
                      e.target.value = '';
                      return;
                    }
                    try {
                      const compressed = await compressImage(file);
                      setImagePreview(compressed);
                    } catch {
                      toast.error('Error al procesar la imagen');
                    }
                  }} />
                  {imagePreview ? (
                    <img src={getImageUrl(imagePreview)!} className="w-full h-full object-contain" alt="Vista previa" />
                  ) : (
                    <span className="text-sm font-medium text-gray-500">Subir imagen</span>
                  )}
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">Cambiar imagen</span>
                    </div>
                  )}
                </label>
                <div className="mt-3 text-xs text-gray-500">Sube cualquier imagen. Se ajustará automáticamente sin deformarse.</div>
                {imagePreview && (
                  <button type="button" onClick={() => setImagePreview(null)} className="mt-2 text-sm text-red-500 hover:text-red-700">
                    Eliminar imagen
                  </button>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-xl border border-gray-200 flex items-center justify-center bg-white shadow-sm overflow-hidden p-1">
                  {imagePreview ? (
                     <img src={getImageUrl(imagePreview)!} className="w-full h-full object-contain" alt="Vista previa POS" />
                  ) : (
                     <span className="text-xs text-gray-400 text-center">Sin imagen</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">Vista previa en TPV</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Acciones ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Producto'}
          </button>
          <Link href="/products" className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
