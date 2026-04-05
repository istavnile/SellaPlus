'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { X, Loader2, Trash2, Mail, Phone, MapPin, Barcode, AlignLeft, User } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:         z.string().min(1, 'El nombre es requerido'),
  email:        z.string().email('Email inválido').or(z.literal('')).optional(),
  phone:        z.string().optional(),
  addressLine1: z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  postalCode:   z.string().optional(),
  country:      z.string().optional(),
  customerCode: z.string().optional(),
  notes:        z.string().max(255, 'Máximo 255 caracteres').optional(),
});

type CustomerForm = z.infer<typeof schema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1">
      <div className="text-gray-400 mt-3 shrink-0">{icon}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const UnderlineInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { placeholder: string }
>(({ placeholder, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    placeholder={placeholder}
    className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 bg-transparent transition-colors"
    {...props}
  />
));
UnderlineInput.displayName = 'UnderlineInput';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerDrawerProps {
  /** null = create mode; string = edit mode with that customer id */
  customerId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: 'MX', label: 'México' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
  { value: 'CO', label: 'Colombia' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'PA', label: 'Panamá' },
  { value: 'HN', label: 'Honduras' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'DO', label: 'Rep. Dominicana' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'BO', label: 'Bolivia' },
];

export function CustomerDrawer({ customerId, open, onClose, onSaved }: CustomerDrawerProps) {
  const isEdit = !!customerId;

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } =
    useForm<CustomerForm>({
      resolver: zodResolver(schema),
      defaultValues: { notes: '' },
    });

  const notes = watch('notes') ?? '';

  // ── Load data when opening in edit mode ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    scrollRef.current?.scrollTo(0, 0);

    if (!isEdit) {
      reset({
        name: '', email: '', phone: '', addressLine1: '',
        city: '', state: '', postalCode: '', country: '',
        customerCode: '', notes: '',
      });
      return;
    }

    setLoadingData(true);
    apiClient.get(`/customers/${customerId}`)
      .then((r) => {
        const c = r.data;
        reset({
          name:         c.name ?? '',
          email:        c.email ?? '',
          phone:        c.phone ?? '',
          addressLine1: c.addressLine1 ?? '',
          city:         c.city ?? '',
          state:        c.state ?? '',
          postalCode:   c.postalCode ?? '',
          country:      c.country ?? '',
          customerCode: c.customerCode ?? '',
          notes:        c.notes ?? '',
        });
      })
      .catch(() => toast.error('No se pudo cargar el cliente'))
      .finally(() => setLoadingData(false));
  }, [open, customerId, isEdit, reset]);

  // ── Close on Escape ────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    try {
      if (isEdit) {
        await apiClient.patch(`/customers/${customerId}`, data);
        toast.success('Cliente actualizado');
      } else {
        await apiClient.post('/customers', data);
        toast.success('Cliente creado');
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
    setDeleting(true);
    try {
      await apiClient.delete(`/customers/${customerId}`);
      toast.success('Cliente eliminado');
      onSaved();
      onClose();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
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
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
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
            <form id="customer-drawer-form" onSubmit={handleSubmit(onSubmit)} className="p-6">

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-indigo-300 flex items-center justify-center">
                  <User size={40} strokeWidth={1.5} className="text-white" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6 space-y-2">

                {/* Nombre */}
                <div className="pb-3">
                  <input
                    {...register('name')}
                    placeholder="Nombre"
                    className="w-full border-0 border-b border-gray-200 py-2 text-2xl text-gray-800 placeholder-gray-300 focus:outline-none focus:border-brand-500 bg-transparent font-light"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <FieldRow icon={<Mail size={18} />}>
                  <UnderlineInput {...register('email')} type="email" placeholder="Correo electrónico" />
                  {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
                </FieldRow>

                <FieldRow icon={<Phone size={18} />}>
                  <UnderlineInput {...register('phone')} type="tel" placeholder="Número de teléfono" />
                </FieldRow>

                <FieldRow icon={<MapPin size={18} />}>
                  <div className="space-y-0">
                    <UnderlineInput {...register('addressLine1')} placeholder="Dirección" />
                    <div className="grid grid-cols-2 gap-x-4 mt-1">
                      <UnderlineInput {...register('city')}  placeholder="Ciudad" />
                      <UnderlineInput {...register('state')} placeholder="Región" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 mt-1">
                      <UnderlineInput {...register('postalCode')} placeholder="Código postal" />
                      <div className="relative">
                        <select
                          {...register('country')}
                          className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500 bg-transparent appearance-none cursor-pointer"
                        >
                          <option value="">País</option>
                          {COUNTRIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-0 top-2.5 text-gray-400">▾</span>
                      </div>
                    </div>
                  </div>
                </FieldRow>

                <FieldRow icon={<Barcode size={18} />}>
                  <UnderlineInput {...register('customerCode')} placeholder="Código de cliente" />
                </FieldRow>

                <FieldRow icon={<AlignLeft size={18} />}>
                  <div>
                    <textarea
                      {...register('notes')}
                      placeholder="Nota"
                      maxLength={255}
                      rows={2}
                      className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 bg-transparent resize-none"
                    />
                    <div className="text-right text-xs text-gray-400">{notes.length} / 255</div>
                  </div>
                </FieldRow>
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
            form="customer-drawer-form"
            disabled={saving || loadingData}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {saving
              ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Guardando...</span>
              : isEdit ? 'Guardar cambios' : 'Crear cliente'}
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

      {/* Confirm delete dialog */}
      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Eliminar cliente</h3>
            <p className="text-sm text-gray-600 mb-5">¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer.</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Sí, eliminar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
