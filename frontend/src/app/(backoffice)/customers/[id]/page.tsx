'use client';

import { useState, useEffect, forwardRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Phone, MapPin, Barcode, AlignLeft, User, Loader2, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ConfirmModal } from '@/components/backoffice/confirm-modal';

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
  notes:        z.string().max(255).optional(),
});

type CustomerForm = z.infer<typeof schema>;

function FieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1">
      <div className="text-gray-400 mt-3 shrink-0">{icon}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const UnderlineInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { placeholder: string }>(
  ({ placeholder, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 bg-transparent transition-colors"
        {...props}
      />
    );
  }
);
UnderlineInput.displayName = 'UnderlineInput';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id     = params.id as string;

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: { notes: '' },
  });

  const notes = watch('notes') ?? '';

  useEffect(() => {
    setLoadingData(true);
    apiClient.get(`/customers/${id}`)
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
      .catch(() => { toast.error('No se pudo cargar el cliente'); router.push('/customers'); })
      .finally(() => setLoadingData(false));
  }, [id, reset, router]);

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    try {
      await apiClient.patch(`/customers/${id}`, data);
      toast.success('Cliente actualizado');
      router.push('/customers');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/customers/${id}`);
      toast.success('Cliente eliminado');
      router.push('/customers');
    } catch {
      toast.error('Error al eliminar');
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Clientes
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
        </div>
        <button
          onClick={handleDeleteClick}
          disabled={deleting}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Eliminar
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-10 space-y-2">

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-indigo-300 flex items-center justify-center">
              <User size={48} strokeWidth={1.5} className="text-white" />
            </div>
          </div>

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
                  <select {...register('country')} className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500 bg-transparent appearance-none cursor-pointer">
                    <option value="">País</option>
                    <option value="MX">México</option>
                    <option value="US">Estados Unidos</option>
                    <option value="ES">España</option>
                    <option value="CO">Colombia</option>
                    <option value="AR">Argentina</option>
                    <option value="CL">Chile</option>
                    <option value="PE">Perú</option>
                    <option value="VE">Venezuela</option>
                    <option value="EC">Ecuador</option>
                    <option value="GT">Guatemala</option>
                    <option value="CR">Costa Rica</option>
                    <option value="PA">Panamá</option>
                    <option value="HN">Honduras</option>
                    <option value="SV">El Salvador</option>
                    <option value="NI">Nicaragua</option>
                    <option value="DO">Rep. Dominicana</option>
                    <option value="UY">Uruguay</option>
                    <option value="PY">Paraguay</option>
                    <option value="BO">Bolivia</option>
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

        <div className="flex items-center gap-3 mt-6">
          <button type="submit" disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link href="/customers" className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message="¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
      />
    </div>
  );
}
