'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShoppingCart,
  Package,
  Plus,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Calendar,
  DollarSign,
  Utensils,
  Pill,
  Sparkles,
  Filter
} from 'lucide-react';

interface ShoppingItem {
  id: string;
  item_name: string;
  category: 'food' | 'medication' | 'hygiene' | 'supplies' | 'household' | 'other';
  quantity: number;
  unit: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_cart' | 'purchased' | 'canceled';
  estimated_cost: number;
  suggested_by_inventory: boolean;
  purchased_at: string | null;
  created_at: string;
}

interface InventoryItem {
  id: string;
  item_name: string;
  item_type: 'medication' | 'supply' | 'diaper' | 'hygiene' | 'nutrition' | 'other';
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  expiration_date: string | null;
  storage_location: string | null;
  notes: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  food: { label: 'Alimentação', icon: Utensils, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  medication: { label: 'Farmácia / Remédios', icon: Pill, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  hygiene: { label: 'Higiene & Cuidados', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  supplies: { label: 'Insumos (Fraldas/Curativos)', icon: Package, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  household: { label: 'Casa & Limpeza', icon: Layers, color: 'text-stone-600 bg-stone-50 dark:bg-stone-800 border-stone-200' },
  other: { label: 'Outros', icon: ShoppingCart, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200' },
};

export default function ShoppingAndInventoryPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;

  const [activeTab, setActiveTab] = useState<'shopping' | 'inventory'>('shopping');
  const [loading, setLoading] = useState(true);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Create Shopping Item Modal
  const [createShopModalOpen, setCreateShopModalOpen] = useState(false);
  const [shopForm, setShopForm] = useState({
    item_name: '',
    category: 'food' as const,
    quantity: 1,
    unit: 'un',
    priority: 'medium' as const,
    estimated_cost: 0,
  });

  // Create Inventory Item Modal
  const [createInvModalOpen, setCreateInvModalOpen] = useState(false);
  const [invForm, setInvForm] = useState({
    item_name: '',
    item_type: 'supply' as const,
    current_quantity: 10,
    minimum_quantity: 3,
    unit: 'un',
    expiration_date: '',
    storage_location: '',
  });

  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);

    try {
      // 1. Fetch shopping items
      let shopQuery = supabase
        .from('shopping_items')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false });

      if (selectedPerson) {
        shopQuery = shopQuery.or(`cared_person_id.eq.${selectedPerson.id},cared_person_id.is.null`);
      }

      const { data: sData } = await shopQuery;
      setShoppingItems(sData || []);

      // 2. Fetch inventory items
      if (selectedPerson) {
        const { data: iData } = await supabase
          .from('care_inventory_items')
          .select('*')
          .eq('cared_person_id', selectedPerson.id)
          .order('item_name', { ascending: true });
        setInventoryItems(iData || []);
      } else {
        setInventoryItems([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, selectedPerson, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle add item to shopping list
  const handleAddShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId || !shopForm.item_name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('shopping_items').insert({
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson?.id || null,
        item_name: shopForm.item_name.trim(),
        category: shopForm.category,
        quantity: Number(shopForm.quantity) || 1,
        unit: shopForm.unit.trim() || 'un',
        priority: shopForm.priority,
        estimated_cost: Number(shopForm.estimated_cost) || 0,
        status: 'pending',
      });

      if (error) {
        alert('Erro ao adicionar item: ' + error.message);
      } else {
        setCreateShopModalOpen(false);
        setShopForm({
          item_name: '',
          category: 'food',
          quantity: 1,
          unit: 'un',
          priority: 'medium',
          estimated_cost: 0,
        });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle item status between pending & purchased
  const handleTogglePurchase = async (item: ShoppingItem) => {
    const newStatus = item.status === 'purchased' ? 'pending' : 'purchased';
    const purchasedAt = newStatus === 'purchased' ? new Date().toISOString() : null;

    // Se estiver marcando como comprado e tiver valor, oferecer lançar como despesa
    if (newStatus === 'purchased' && item.estimated_cost > 0 && selectedPerson) {
      const confirmExpense = window.confirm(`Deseja registrar o valor de R$ ${item.estimated_cost.toFixed(2)} em Despesas da Família?`);
      if (confirmExpense) {
        await supabase.from('expenses').insert({
          organization_id: currentOrganizationId,
          cared_person_id: selectedPerson.id,
          category: item.category === 'medication' ? 'pharmacy' : item.category === 'food' ? 'food' : 'general',
          description: `Compra: ${item.item_name}`,
          amount: item.estimated_cost,
          currency: 'BRL',
          created_by: user?.id || selectedPerson.id,
        }).catch(console.warn);
      }
    }

    await supabase
      .from('shopping_items')
      .update({ status: newStatus, purchased_at: purchasedAt })
      .eq('id', item.id);

    fetchData();
  };

  // Handle add item to inventory
  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId || !selectedPerson || !invForm.item_name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('care_inventory_items').insert({
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        item_name: invForm.item_name.trim(),
        item_type: invForm.item_type,
        current_quantity: Number(invForm.current_quantity) || 0,
        minimum_quantity: Number(invForm.minimum_quantity) || 1,
        unit: invForm.unit.trim() || 'un',
        expiration_date: invForm.expiration_date || null,
        storage_location: invForm.storage_location.trim() || null,
      });

      if (error) {
        alert('Erro ao cadastrar estoque: ' + error.message);
      } else {
        setCreateInvModalOpen(false);
        setInvForm({
          item_name: '',
          item_type: 'supply',
          current_quantity: 10,
          minimum_quantity: 3,
          unit: 'un',
          expiration_date: '',
          storage_location: '',
        });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  // Adjust inventory quantity (+1 or -1)
  const handleAdjustInventory = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.current_quantity + delta);

    await supabase
      .from('care_inventory_items')
      .update({ current_quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    // Registra log compensatório auditado
    await supabase.from('care_inventory_logs').insert({
      inventory_item_id: item.id,
      organization_id: currentOrganizationId,
      cared_person_id: selectedPerson?.id,
      log_type: delta > 0 ? 'entry' : 'dispense',
      quantity: Math.abs(delta),
      reason: delta > 0 ? 'Entrada rápida no painel' : 'Uso registrado na rotina',
      created_by: user?.id || null,
    }).catch(console.warn);

    fetchData();
  };

  // Add low-stock item to shopping list with 1-click
  const handleAddLowStockToShopping = async (item: InventoryItem) => {
    if (!currentOrganizationId) return;

    await supabase.from('shopping_items').insert({
      organization_id: currentOrganizationId,
      cared_person_id: selectedPerson?.id || null,
      item_name: item.item_name,
      category: item.item_type === 'medication' ? 'medication' : 'supplies',
      quantity: item.minimum_quantity * 2,
      unit: item.unit,
      priority: 'high',
      suggested_by_inventory: true,
      status: 'pending',
    });

    alert(`"${item.item_name}" foi adicionado à Lista de Compras!`);
    fetchData();
  };

  const lowStockItems = inventoryItems.filter(i => i.current_quantity <= i.minimum_quantity);
  const pendingShopping = shoppingItems.filter(i => i.status !== 'purchased');
  const purchasedShopping = shoppingItems.filter(i => i.status === 'purchased');

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#101D2B] p-6 rounded-3xl border border-stone-200 dark:border-[#172433] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900 dark:text-[#F8FAFC]">Compras & Estoque</h1>
              <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 text-xs font-bold">
                Abastecimento da Casa
              </Badge>
            </div>
            <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
              Lista compartilhada entre familiares e controle de insumos (fraldas, curativos, farmácia e despensa)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'shopping' ? (
            <Button
              onClick={() => setCreateShopModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5 flex items-center gap-2 shadow-xs transition active:scale-95"
            >
              <Plus className="h-5 w-5" /> Novo Item de Compra
            </Button>
          ) : (
            <Button
              onClick={() => setCreateInvModalOpen(true)}
              disabled={!selectedPerson}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl px-5 flex items-center gap-2 shadow-xs transition active:scale-95"
            >
              <Plus className="h-5 w-5" /> Novo Insumo em Estoque
            </Button>
          )}
        </div>
      </div>

      {/* ALERTA DE ESTOQUE BAIXO SE HOUVER */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                Atenção: {lowStockItems.length} {lowStockItems.length === 1 ? 'item atingiu' : 'itens atingiram'} o estoque mínimo!
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {lowStockItems.map(i => `${i.item_name} (${i.current_quantity} ${i.unit})`).join(', ')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setActiveTab('inventory')}
            variant="outline"
            className="border-amber-500 text-amber-800 dark:text-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold h-9"
          >
            Ver Insumos Baixos
          </Button>
        </div>
      )}

      {/* TABS DE SELEÇÃO */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-[#172433] pb-2">
        <button
          onClick={() => setActiveTab('shopping')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'shopping'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <ShoppingCart className="h-4 w-4" /> Lista Compartilhada ({pendingShopping.length})
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'inventory'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <Package className="h-4 w-4" /> Estoque de Insumos ({inventoryItems.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: LISTA DE COMPRAS */}
      {activeTab === 'shopping' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>
          ) : shoppingItems.length === 0 ? (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-[#172433] space-y-3">
              <p className="text-4xl">🛒</p>
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Lista de compras vazia</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Adicione itens que a família ou cuidadores precisam comprar para o idoso ou para a casa.
              </p>
              <Button onClick={() => setCreateShopModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs">
                Adicionar Primeiro Item
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pendentes */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-sm text-stone-700 dark:text-slate-300 uppercase tracking-wide">
                  Itens Pendentes ({pendingShopping.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingShopping.map(item => {
                    const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;
                    const Icon = cat.icon;
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-[#101D2B] p-4 rounded-2xl border border-stone-200 dark:border-[#172433] flex items-center justify-between gap-3 shadow-xs hover:border-emerald-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTogglePurchase(item)}
                            className="w-7 h-7 rounded-lg border-2 border-stone-300 dark:border-stone-600 hover:border-emerald-500 flex items-center justify-center transition"
                            title="Marcar como comprado"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-stone-900 dark:text-white">{item.item_name}</span>
                              {item.suggested_by_inventory && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                                  Estoque Baixo
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                              <span>{item.quantity} {item.unit}</span>
                              <span>·</span>
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cat.color}`}>{cat.label}</span>
                            </div>
                          </div>
                        </div>

                        {item.estimated_cost > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-[#19D3A2]">
                            R$ {item.estimated_cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comprados */}
              {purchasedShopping.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-stone-200 dark:border-[#172433]">
                  <h3 className="font-extrabold text-sm text-stone-400 dark:text-slate-500 uppercase tracking-wide">
                    Comprados Recentemente ({purchasedShopping.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    {purchasedShopping.map(item => (
                      <div
                        key={item.id}
                        className="bg-stone-50 dark:bg-[#172433] p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTogglePurchase(item)}
                            className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center"
                            title="Desmarcar"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <span className="font-semibold text-sm line-through text-stone-500">{item.item_name} ({item.quantity} {item.unit})</span>
                        </div>
                        {item.purchased_at && (
                          <span className="text-[10px] text-stone-400">
                            {new Date(item.purchased_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: ESTOQUE DE INSUMOS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {!selectedPerson ? (
            <p className="text-xs text-stone-500 text-center py-12">Selecione uma pessoa cuidada para visualizar seu estoque de insumos.</p>
          ) : inventoryItems.length === 0 ? (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-[#172433] space-y-3">
              <p className="text-4xl">📦</p>
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Nenhum insumo cadastrado</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Cadastre pacotes de fraldas, curativos, caixas de medicamentos e suplementos para receber alertas automáticos quando estiverem acabando.
              </p>
              <Button onClick={() => setCreateInvModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs">
                Cadastrar Primeiro Insumo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryItems.map(item => {
                const isLow = item.current_quantity <= item.minimum_quantity;
                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-[#101D2B] p-5 rounded-3xl border shadow-xs space-y-4 transition ${
                      isLow ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20' : 'border-stone-200 dark:border-[#172433]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-base text-stone-900 dark:text-white leading-tight">
                          {item.item_name}
                        </h4>
                        <span className="text-[11px] text-stone-400 capitalize">
                          Tipo: {item.item_type}
                        </span>
                      </div>
                      {isLow && (
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          Estoque Baixo!
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-stone-50 dark:bg-[#172433] p-3 rounded-2xl">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-stone-400">Quantidade Atual</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-white">
                          {item.current_quantity} <span className="text-xs font-semibold text-stone-400">{item.unit}</span>
                        </p>
                        <p className="text-[10px] text-stone-400">Mínimo desejado: {item.minimum_quantity} {item.unit}</p>
                      </div>

                      {/* Botões rápidos +1 e -1 */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjustInventory(item, -1)}
                          className="w-8 h-8 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 font-black text-sm flex items-center justify-center transition"
                          title="Dar baixa em 1 unidade"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleAdjustInventory(item, 1)}
                          className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center transition"
                          title="Adicionar 1 unidade"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {isLow && (
                      <Button
                        onClick={() => handleAddLowStockToShopping(item)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-9 flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> Adicionar às Compras
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL ADICIONAR ITEM NA LISTA DE COMPRAS */}
      <Dialog open={createShopModalOpen} onOpenChange={setCreateShopModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900 dark:text-white">
              Adicionar Item à Lista de Compras
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Item compartilhado visível para familiares e cuidadores
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddShoppingItem} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nome do Produto *</Label>
              <Input
                required
                placeholder="Ex: Fraldas G, Leite Desnatado, Dipirona, Sabonete líquido"
                value={shopForm.item_name}
                onChange={(e) => setShopForm({ ...shopForm, item_name: e.target.value })}
                className="rounded-xl h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Categoria</Label>
                <Select
                  value={shopForm.category}
                  onValueChange={(val) => setShopForm({ ...shopForm, category: val as any })}
                >
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Alimentação</SelectItem>
                    <SelectItem value="medication">Farmácia</SelectItem>
                    <SelectItem value="hygiene">Higiene</SelectItem>
                    <SelectItem value="supplies">Insumos</SelectItem>
                    <SelectItem value="household">Casa</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Prioridade</Label>
                <Select
                  value={shopForm.priority}
                  onValueChange={(val) => setShopForm({ ...shopForm, priority: val as any })}
                >
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={shopForm.quantity}
                  onChange={(e) => setShopForm({ ...shopForm, quantity: Number(e.target.value) })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Previsão Custo (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={shopForm.estimated_cost}
                  onChange={(e) => setShopForm({ ...shopForm, estimated_cost: Number(e.target.value) })}
                  className="rounded-xl h-10"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateShopModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5">
                {saving ? 'Adicionando...' : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ADICIONAR INSUMO NO ESTOQUE */}
      <Dialog open={createInvModalOpen} onOpenChange={setCreateInvModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900 dark:text-white">
              Cadastrar Insumo no Estoque
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Acompanhamento de fraldas, curativos, caixas de remédio e nutrição
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddInventoryItem} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nome do Insumo *</Label>
              <Input
                required
                placeholder="Ex: Fralda G Confort, Soro Fisiológico, Curativo hidrocoloide"
                value={invForm.item_name}
                onChange={(e) => setInvForm({ ...invForm, item_name: e.target.value })}
                className="rounded-xl h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Qtd Atual</Label>
                <Input
                  type="number"
                  min="0"
                  value={invForm.current_quantity}
                  onChange={(e) => setInvForm({ ...invForm, current_quantity: Number(e.target.value) })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Qtd Mínima (Alerta)</Label>
                <Input
                  type="number"
                  min="1"
                  value={invForm.minimum_quantity}
                  onChange={(e) => setInvForm({ ...invForm, minimum_quantity: Number(e.target.value) })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold">Local onde fica guardado</Label>
                <Input
                  placeholder="Ex: Armário do banheiro, Gaveta do quarto"
                  value={invForm.storage_location}
                  onChange={(e) => setInvForm({ ...invForm, storage_location: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateInvModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-5">
                {saving ? 'Cadastrando...' : 'Cadastrar no Estoque'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
