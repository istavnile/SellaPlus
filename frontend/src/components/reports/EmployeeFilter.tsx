'use client';

import { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Users, ChevronDown, Check } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export interface EmployeeFilterProps {
  cashierId: string | undefined;
  onChange: (id: string | undefined) => void;
}

export function EmployeeFilter({ cashierId, onChange }: EmployeeFilterProps) {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    apiClient.get('/users')
      .then(res => {
        if (!unmounted) {
          setUsers(res.data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!unmounted) setLoading(false);
      });
    return () => { unmounted = true; };
  }, []);

  const selectedUser = users.find(u => u.id === cashierId);

  return (
    <Menu as="div" className="relative inline-block text-left w-full sm:w-auto">
      <Menu.Button className="flex w-full items-center justify-between sm:justify-start gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium tracking-tight transition-colors">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-400 shrink-0" />
          <span className="truncate max-w-[120px] sm:max-w-xs">{selectedUser ? selectedUser.name : 'Todos los colaboradores'}</span>
        </div>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-full sm:w-56 origin-top-right sm:origin-top-left divide-y divide-gray-100 rounded-md bg-white shadow-xl ring-1 ring-black/5 focus:outline-none p-1 border border-gray-100 z-50">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
            Filtrar por Colaborador
          </div>
          
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => onChange(undefined)}
                className={`${
                  active ? 'bg-brand-50 text-brand-700' : 'text-gray-700'
                } group flex w-full text-left items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors`}
              >
                <div className="w-4 flex justify-center shrink-0">
                  {!cashierId && <Check size={14} className="text-brand-600" />}
                </div>
                Todos los colaboradores
              </button>
            )}
          </Menu.Item>

          {!loading && users.map(user => (
            <Menu.Item key={user.id}>
              {({ active }) => (
                <button
                  onClick={() => onChange(user.id)}
                  className={`${
                    active ? 'bg-brand-50 text-brand-700' : 'text-gray-700'
                  } group flex w-full text-left items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors`}
                >
                  <div className="w-4 flex justify-center shrink-0">
                    {cashierId === user.id && <Check size={14} className="text-brand-600" />}
                  </div>
                  {user.name}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
