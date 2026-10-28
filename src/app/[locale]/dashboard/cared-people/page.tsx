'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users, UserPlus, Phone, MapPin, Calendar, ChevronRight,
  ExternalLink, Heart, AlertCircle, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CaredPeoplePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'pt-BR';
  const { currentOrganizationId, user } = useAuth();
  const { caredPeople, loading, refreshCaredPeople } = useCaredPerson();
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [memberRole, setMemberRole] = useState<string>('collaborator');

  useEffect(() => {
    if (!currentOrganizationId || !user) return;
    supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', currentOrganizationId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.role) setMemberRole(data.role);
      });
  }, [currentOrganizationId, user]);

  const canManage = memberRole === 'owner' || memberRole === 'admin';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-[#1D4ED8]" />
            Idosos Cadastrados
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Gerencie os perfis das pessoas sob cuidado
          </p>
        </div>
        {canManage && (
          <Link href={`/${locale}/dashboard/cared-people/new`}>
            <Button className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-bold rounded-2xl flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Idoso
            </Button>
          </Link>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && caredPeople.length === 0 && (
        <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900 dark:text-white">Nenhum idoso cadastrado</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Adicione o primeiro perfil para começar a cuidar.
            </p>
          </div>
          {canManage && (
            <Link href={`/${locale}/dashboard/cared-people/new`}>
              <Button className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-bold rounded-2xl">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Idoso
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {!loading && caredPeople.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {caredPeople.map((person: any) => (
            <div
              key={person.id}
              className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#1D4ED8] text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                  {person.full_name ? person.full_name.charAt(0).toUpperCase() : 'I'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-stone-900 dark:text-white truncate">
                    {person.full_name}
                  </h3>
                  {person.date_of_birth && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {new Date().getFullYear() - new Date(person.date_of_birth).getFullYear()} anos
                    </p>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold mt-1 border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30"
                  >
                    Ativo
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
                {person.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{person.phone}</span>
                  </div>
                )}
                {person.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{person.address}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-stone-100 dark:border-[#1E293B]">
                <Link
                  href={`/${locale}/dashboard/cared-people/${person.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#1D4ED8] dark:text-blue-400 hover:underline py-1.5"
                >
                  Ver perfil <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/${locale}/care/${person.id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline py-1.5 px-2"
                >
                  Modo Idoso <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom: Add another */}
      {!loading && caredPeople.length > 0 && canManage && (
        <div className="flex justify-center pt-2">
          <Link href={`/${locale}/dashboard/cared-people/new`}>
            <Button
              variant="outline"
              className="rounded-2xl border-dashed border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-bold hover:border-[#1D4ED8] hover:text-[#1D4ED8] dark:hover:text-blue-400 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar outro idoso
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
