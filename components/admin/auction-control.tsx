
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Play,
  Square,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface BidData {
  id: string;
  amount: number;
  timestamp: Date;
  bidder: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  };
}

interface LotData {
  id: string;
  placa: string;
  marca: string;
  linea: string;
  modelo: number;
  images: string[];
  status: string;
  startingPrice: number;
  currentPrice: number | null;
  bidIncrement: number;
  auctionStartTime: Date | null;
  auctionEndTime: Date | null;
  isExtended: boolean;
  owner: {
    id: string;
    email: string;
    companyName: string | null;
  };
  _count?: {
    bids: number;
  };
  bids?: BidData[];
  uniqueBidders?: number;
}

export function AuctionControl() {
  const [lots, setLots] = useState<LotData[]>([]);
  const [selectedLot, setSelectedLot] = useState<LotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [newIncrement, setNewIncrement] = useState('');
  const [extendMinutes, setExtendMinutes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchActiveLots();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchActiveLots(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveLots = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const res = await fetch('/api/admin/auction-control');
      const data = await res.json();
      setLots(data.lots || []);
    } catch (error) {
      console.error('Error fetching lots:', error);
      if (!silent) {
        toast.error('Error al cargar subastas');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLotDetails = async (lotId: string) => {
    try {
      const res = await fetch(`/api/admin/auction-control?lotId=${lotId}`);
      const data = await res.json();
      setSelectedLot(data.lot);
      setDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching lot details:', error);
      toast.error('Error al cargar detalles');
    }
  };

  const openSettingsModal = (lot: LotData) => {
    setSelectedLot(lot);
    setNewIncrement(lot.bidIncrement.toString());
    setExtendMinutes('');
    setSettingsModalOpen(true);
  };

  const handleUpdateIncrement = async () => {
    if (!selectedLot || !newIncrement) return;

    const incrementValue = parseFloat(newIncrement);
    if (isNaN(incrementValue) || incrementValue <= 0) {
      toast.error('Ingresa un valor válido');
      return;
    }

    try {
      setProcessingAction(true);
      const res = await fetch('/api/admin/auction-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: selectedLot.id,
          action: 'updateIncrement',
          value: incrementValue
        })
      });

      if (!res.ok) throw new Error('Error al actualizar');

      toast.success('✅ Incremento actualizado');
      fetchActiveLots();
      setSettingsModalOpen(false);
    } catch (error) {
      toast.error('Error al actualizar incremento');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleExtendTime = async () => {
    if (!selectedLot || !extendMinutes) return;

    const minutes = parseInt(extendMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error('Ingresa minutos válidos');
      return;
    }

    try {
      setProcessingAction(true);
      const res = await fetch('/api/admin/auction-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: selectedLot.id,
          action: 'extendTime',
          value: minutes
        })
      });

      if (!res.ok) throw new Error('Error al extender');

      toast.success(`✅ Subasta extendida ${minutes} minutos`);
      fetchActiveLots();
      setSettingsModalOpen(false);
    } catch (error) {
      toast.error('Error al extender tiempo');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleActivateLot = async (lotId: string) => {
    try {
      setProcessingAction(true);
      const res = await fetch('/api/admin/auction-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId,
          action: 'activateLot'
        })
      });

      if (!res.ok) throw new Error('Error al activar');

      toast.success('✅ Subasta activada');
      fetchActiveLots();
    } catch (error) {
      toast.error('Error al activar subasta');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFinishLot = async (lotId: string) => {
    if (!confirm('¿Estás seguro de finalizar esta subasta?')) return;

    try {
      setProcessingAction(true);
      const res = await fetch('/api/admin/auction-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId,
          action: 'finishLot'
        })
      });

      if (!res.ok) throw new Error('Error al finalizar');

      toast.success('✅ Subasta finalizada');
      fetchActiveLots();
    } catch (error) {
      toast.error('Error al finalizar subasta');
    } finally {
      setProcessingAction(false);
    }
  };

  const getTimeRemaining = (endTime: Date | null) => {
    if (!endTime) return 'Sin definir';
    
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Finalizada';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutos`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando subastas activas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Subastas en Vivo</h1>
          <p className="text-gray-600 mt-1">Gestiona las subastas activas en tiempo real</p>
        </div>
        <Button
          onClick={() => fetchActiveLots()}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {lots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Clock className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">No hay subastas activas</p>
            <p className="text-sm text-gray-500 mt-1">
              Las subastas activas aparecerán aquí
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {lots.map((lot) => {
            const timeRemaining = getTimeRemaining(lot.auctionEndTime);
            const isExpiringSoon = lot.auctionEndTime && 
              new Date(lot.auctionEndTime).getTime() - new Date().getTime() < 15 * 60 * 1000;

            return (
              <Card key={lot.id} className={isExpiringSoon ? 'border-orange-500 border-2' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-xl">
                          {lot.marca} {lot.linea} {lot.modelo}
                        </CardTitle>
                        <Badge className="bg-green-100 text-green-800">
                          <Play className="h-3 w-3 mr-1" />
                          EN VIVO
                        </Badge>
                        {lot.isExtended && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Tiempo Extendido
                          </Badge>
                        )}
                        {isExpiringSoon && (
                          <Badge className="bg-red-100 text-red-800 animate-pulse">
                            ¡Finalizando Pronto!
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Placa: {lot.placa} • {lot.owner.companyName}
                      </CardDescription>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSettingsModal(lot)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchLotDetails(lot.id)}
                      >
                        Ver Detalles
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleFinishLot(lot.id)}
                        disabled={processingAction}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Finalizar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-[150px_1fr] gap-6">
                    {/* Image */}
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      {lot.images && lot.images.length > 0 ? (
                        <Image
                          src={lot.images[0]}
                          alt={`${lot.marca} ${lot.linea}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Precio Actual</p>
                          <p className="text-lg font-bold text-blue-600">
                            ${(lot.currentPrice || lot.startingPrice).toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Incremento</p>
                          <p className="text-lg font-bold text-green-600">
                            ${lot.bidIncrement.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Postores</p>
                          <p className="text-lg font-bold text-purple-600">
                            {lot.uniqueBidders || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${
                          isExpiringSoon ? 'bg-red-100' : 'bg-orange-100'
                        }`}>
                          <Clock className={`h-5 w-5 ${
                            isExpiringSoon ? 'text-red-600' : 'text-orange-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tiempo Restante</p>
                          <p className={`text-lg font-bold ${
                            isExpiringSoon ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {timeRemaining}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {lot.auctionEndTime && (
                    <div className="mt-4 text-sm text-gray-600">
                      Finaliza: {format(new Date(lot.auctionEndTime), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración de Subasta</DialogTitle>
            <DialogDescription>
              Modifica los parámetros en tiempo real
            </DialogDescription>
          </DialogHeader>
          
          {selectedLot && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedLot.marca} {selectedLot.linea}</p>
                <p className="text-sm text-gray-600">Placa: {selectedLot.placa}</p>
              </div>

              {/* Update Increment */}
              <div className="space-y-3">
                <Label>Modificar Incremento Mínimo</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="50000"
                    value={newIncrement}
                    onChange={(e) => setNewIncrement(e.target.value)}
                  />
                  <Button
                    onClick={handleUpdateIncrement}
                    disabled={processingAction}
                  >
                    Actualizar
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Incremento actual: ${selectedLot.bidIncrement.toLocaleString('es-CO')}
                </p>
              </div>

              {/* Extend Time */}
              <div className="space-y-3">
                <Label>Extender Tiempo de Subasta</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="15"
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(e.target.value)}
                  />
                  <Button
                    onClick={handleExtendTime}
                    disabled={processingAction}
                  >
                    Extender
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Tiempo a agregar en minutos
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsModalOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Subasta</DialogTitle>
            <DialogDescription>
              Historial completo de pujas
            </DialogDescription>
          </DialogHeader>
          
          {selectedLot && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-lg">{selectedLot.marca} {selectedLot.linea} {selectedLot.modelo}</p>
                <p className="text-sm text-gray-600">Placa: {selectedLot.placa}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedLot.bids?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Pujas</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedLot.uniqueBidders || 0}
                  </p>
                  <p className="text-sm text-gray-600">Postores Únicos</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    ${(selectedLot.currentPrice || selectedLot.startingPrice).toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-gray-600">Puja Más Alta</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Historial de Pujas</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedLot.bids && selectedLot.bids.length > 0 ? (
                    selectedLot.bids.map((bid, index) => (
                      <div
                        key={bid.id}
                        className={`p-3 rounded-lg border ${
                          index === 0 ? 'bg-green-50 border-green-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              ${bid.amount.toLocaleString('es-CO')}
                              {index === 0 && (
                                <Badge className="ml-2 bg-green-600 text-white">Ganando</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              {bid.bidder.companyName || 
                               `${bid.bidder.firstName} ${bid.bidder.lastName}`}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(bid.timestamp), {
                              addSuffix: true,
                              locale: es
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No hay pujas todavía
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailsModalOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
