import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from './navigation/Header';
import { useAuth } from '../../hooks/useAuth';
import { getUserOrders, getUserSavedDrafts, deleteSavedDraft } from '../../services/orderService';
import {
  getSavedAddresses,
  getSavedBilling,
  deleteAddress,
  updateAddress,
  deleteSavedBilling,
  updateUserName,
  updateUserPhone,
  SavedAddress,
  SavedBilling,
} from '../../services/userProfileService';
import { PhoneInput, COUNTRY_CODES } from './ui/PhoneInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { AspectRatio } from './ui/aspect-ratio';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import {
  Package,
  Calendar,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Coffee,
  BookMarked,
  Trash2,
  Pencil,
  MapPin,
  CreditCard,
  User,
  Lock,
  Check,
  X,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import { useLanguage } from '../context/LanguageContext';
import { buildWhatsAppUrl } from '../config/contact';

import justWhiteImg from '../../assets/justwhite.png';

interface Order {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  total: number;
  customAlbumSize?: string;
  coverData?: {
    image?: string;
    title?: string;
    subtitle?: string;
  };
  customization?: {
    size?: string;
    paper?: string;
    year?: number;
    material?: string;
    coverType?: string;
  };
  pages?: Array<{ images?: string[]; image?: string }>;
  photos?: string[] | string[][];
  items?: any[];
  product?: {
    id?: string;
    name?: string;
    type?: string;
  };
  productType?: string;
}

function getPreviewImage(order: Order): string | null {
  if (order.productType === 'custom-album') return null;
  const productString = String(order.product?.type || order.product?.id || order.product?.name || order.productType || '').toLowerCase();
  const isCalendar = productString.includes('calendar') || productString.includes('calendario') || order.customization?.year !== undefined;
  const isMug = productString.includes('mug') || productString.includes('taza');

  let imageUrl: string | null = null;

  if (isCalendar) {
    const januaryPage = order.pages?.[0];
    if (januaryPage) {
      if (Array.isArray(januaryPage.images) && januaryPage.images.length > 0) imageUrl = januaryPage.images[0];
      else if (januaryPage.image) imageUrl = januaryPage.image;
    }
    if (!imageUrl && order.photos && order.photos.length > 0) {
      const firstPhoto = order.photos[0];
      imageUrl = Array.isArray(firstPhoto) ? firstPhoto[0] : firstPhoto as string;
    }
  } else if (isMug) {
    if (order.items && order.items.length > 0) {
      imageUrl = order.items[0].photo || order.items[0].photos?.[0];
    }
  } else {
    const isTela =
      order.customization?.material === 'Tela' ||
      order.customization?.coverType === 'Tela';

    if (!isTela) {
      imageUrl = order.coverData?.image || null;
    }

    if (!imageUrl) {
      const firstPage = order.pages?.[0];
      if (firstPage) {
        if (Array.isArray(firstPage.images) && firstPage.images.length > 0) {
          imageUrl = firstPage.images[0];
        } else if (firstPage.image) {
          imageUrl = firstPage.image;
        }
      }
    }
    if (!imageUrl && order.photos && order.photos.length > 0) {
      const firstPhoto = order.photos[0];
      imageUrl = Array.isArray(firstPhoto) ? firstPhoto[0] : firstPhoto as string;
    }
  }

  if (!imageUrl) imageUrl = order.coverData?.image || null;
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.includes('justwhite')) imageUrl = justWhiteImg;
  return imageUrl;
}

/** Ids de borradores que son "el más reciente" dentro de un grupo con más de un borrador
 * del mismo producto (probables duplicados) — se usa para resaltarlos en la lista. */
function getMostRecentDuplicateDraftIds(drafts: Order[]): Set<string> {
  const groups = new Map<string, Order[]>();
  drafts.forEach((d) => {
    const key = String(d.product?.type || d.product?.id || d.product?.name || d.productType || 'unknown').toLowerCase();
    const group = groups.get(key) || [];
    group.push(d);
    groups.set(key, group);
  });

  const result = new Set<string>();
  groups.forEach((group) => {
    if (group.length < 2) return;
    const time = (d: Order) => (d.updatedAt ? new Date(d.updatedAt).getTime() : 0) || 0;
    const newest = group.reduce((a, b) => (time(a) >= time(b) ? a : b));
    result.add(newest.id);
  });
  return result;
}

const UserDashboard: React.FC = () => {
  const { user, userData, resetPassword, refreshUserData } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Projects tab state
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeletingDraftId, setIsDeletingDraftId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Tab state
  const [activeTab, setActiveTab] = useState<'projects' | 'account'>('projects');

  // Account tab state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedBillingData, setSavedBillingData] = useState<SavedBilling | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [phoneCode, setPhoneCode] = useState('+57');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressEditForm, setAddressEditForm] = useState<Partial<SavedAddress>>({});
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSavedId, setAddressSavedId] = useState<string | null>(null);
  const [isDeletingAddressId, setIsDeletingAddressId] = useState<string | null>(null);
  const [isDeletingBilling, setIsDeletingBilling] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'custom_pendiente':
        return { text: 'Pendiente de contacto', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' };
      case 'custom_contactado':
        return { text: 'Contactado', className: 'bg-green-100 text-green-800 hover:bg-green-100' };
      case 'mock_paid':
      case 'paid':
        return { text: t('status.paid'), className: 'bg-green-100 text-green-800 hover:bg-green-100' };
      case 'pending_payment':
        return { text: t('status.pending_payment'), className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' };
      case 'en_produccion':
        return { text: t('status.en_produccion'), className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' };
      case 'enviado':
        return { text: t('status.enviado'), className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' };
      case 'entregado':
        return { text: t('status.entregado'), className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' };
      default:
        return { text: t('status.unknown'), className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' };
    }
  };

  const formatPriceCOP = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const [userOrders, userDrafts, userAddresses, userBilling] = await Promise.all([
          getUserOrders(user.uid),
          getUserSavedDrafts(user.uid),
          getSavedAddresses(user.uid),
          getSavedBilling(user.uid),
        ]);
        setOrders(userOrders.filter((o: Order) => o.status !== 'saved_draft'));
        setSavedDrafts(userDrafts);
        setSavedAddresses(userAddresses);
        setSavedBillingData(userBilling);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('error.fetchOrders');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Sync name input when userData loads
  useEffect(() => {
    if (userData?.name) setNameInput(userData.name);
  }, [userData]);

  useEffect(() => {
    if (userData?.phone) {
      const phone: string = userData.phone;
      const match = [...COUNTRY_CODES]
        .sort((a, b) => b.code.length - a.code.length)
        .find(c => phone.startsWith(c.code));
      if (match) {
        setPhoneCode(match.code);
        setPhoneNumber(phone.slice(match.code.length));
      } else {
        setPhoneNumber(phone);
      }
    }
  }, [userData]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleContinueDraft = (draft: Order) => {
    navigate('/create', { state: { resumeSavedDraft: draft.id } });
  };

  const handleEditOrder = (order: Order) => {
    navigate('/create', { state: { editPaidOrder: order.id, productType: order.productType } });
  };

  const handleDeleteDraft = async (draftId: string) => {
    setIsDeletingDraftId(draftId);
    try {
      await deleteSavedDraft(draftId);
      setSavedDrafts(prev => prev.filter(d => d.id !== draftId));
    } catch (e) {
      console.error('Error deleting draft', e);
    } finally {
      setIsDeletingDraftId(null);
    }
  };

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setIsSavingName(true);
    try {
      await updateUserName(user.uid, nameInput.trim());
      await refreshUserData();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    } catch (e) {
      console.error('Error saving name', e);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user || !phoneNumber.trim()) return;
    setIsSavingPhone(true);
    try {
      await updateUserPhone(user.uid, phoneCode + phoneNumber.trim());
      await refreshUserData();
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (e) {
      console.error('Error saving phone', e);
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
      await resetPassword(user.email);
      setIsResetSent(true);
      setTimeout(() => setIsResetSent(false), 5000);
    } catch (e) {
      console.error('Error sending reset email', e);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    setIsDeletingAddressId(addressId);
    try {
      await deleteAddress(user.uid, addressId);
      setSavedAddresses(prev => prev.filter(a => a.id !== addressId));
    } catch (e) {
      console.error('Error deleting address', e);
    } finally {
      setIsDeletingAddressId(null);
    }
  };

  const handleStartEditAddress = (address: SavedAddress) => {
    setEditingAddressId(address.id);
    setAddressEditForm({ ...address });
  };

  const handleCancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressEditForm({});
  };

  const handleSaveAddress = async (addressId: string) => {
    if (!user) return;
    setIsSavingAddress(true);
    try {
      const { id, savedAt, ...updates } = addressEditForm as SavedAddress;
      await updateAddress(user.uid, addressId, updates);
      setSavedAddresses(prev =>
        prev.map(a => a.id === addressId ? { ...a, ...updates } : a)
      );
      setEditingAddressId(null);
      setAddressEditForm({});
      setAddressSavedId(addressId);
      setTimeout(() => setAddressSavedId(null), 3000);
    } catch (e) {
      console.error('Error saving address', e);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteBilling = async () => {
    if (!user) return;
    setIsDeletingBilling(true);
    try {
      await deleteSavedBilling(user.uid);
      setSavedBillingData(null);
    } catch (e) {
      console.error('Error deleting billing', e);
    } finally {
      setIsDeletingBilling(false);
    }
  };

  const dateLocale = language === 'es' ? es : enUS;

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-10 px-4">
          <h1 className="text-3xl font-bold mb-8">{t('dashboard.title')}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-10 px-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t('common.error')}</h2>
          <p className="text-gray-600">{t(error)}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto py-10 px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-2">{t('dashboard.subtitle')}</p>
        </header>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex gap-0">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'projects'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.tab.projects')}
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'account'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.tab.account')}
            </button>
          </nav>
        </div>

        {/* ── TAB: Proyectos ── */}
        {activeTab === 'projects' && (
          <>
            {/* SECCIÓN: Borradores guardados */}
            {savedDrafts.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BookMarked className="h-5 w-5 text-gray-700" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{t('draft.sectionTitle')}</h2>
                      <p className="text-sm text-gray-500">
                        {t('draft.sectionSubtitle').replace('{count}', String(savedDrafts.length)).replace('{max}', '3')}
                      </p>
                    </div>
                  </div>
                  {savedDrafts.length >= 3 && (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {t('draft.limitWarning')}
                    </span>
                  )}
                </div>

                <div className={`grid grid-cols-1 gap-6 ${
                  savedDrafts.length === 1 ? 'md:grid-cols-1 md:max-w-sm' :
                  savedDrafts.length === 2 ? 'md:grid-cols-2' :
                  'md:grid-cols-3'
                }`}>
                  {(() => {
                    const mostRecentDuplicateIds = getMostRecentDuplicateDraftIds(savedDrafts);
                    return savedDrafts.map((draft) => {
                    const productString = String(draft.product?.type || draft.product?.id || draft.product?.name || draft.productType || '').toLowerCase();
                    const isCalendar = productString.includes('calendar') || productString.includes('calendario');
                    const isMug = productString.includes('mug') || productString.includes('taza');
                    const ProductIcon = isCalendar ? Calendar : isMug ? Coffee : ImageIcon;
                    const imageUrl = getPreviewImage(draft);
                    const updatedDate = draft.updatedAt
                      ? format(new Date(draft.updatedAt), 'PP', { locale: dateLocale })
                      : '';
                    const isMostRecentDuplicate = mostRecentDuplicateIds.has(draft.id);

                    return (
                      <div key={draft.id} className="group relative border border-dashed border-gray-300 rounded-2xl overflow-hidden hover:border-gray-400 hover:shadow-md transition-all duration-200 bg-white">
                        <AspectRatio ratio={16 / 9}>
                          {imageUrl && !failedImages.has(draft.id) ? (
                            <img
                              src={imageUrl}
                              alt={draft.coverData?.title || draft.product?.name || 'Draft'}
                              className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                              onError={() => setFailedImages(prev => new Set(prev).add(draft.id))}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                              <ProductIcon className="h-10 w-10 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <span className="text-xs font-semibold bg-white/90 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
                              {t('draft.savedOn').replace('{date}', updatedDate)}
                            </span>
                            {isMostRecentDuplicate && (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                                Más reciente
                              </span>
                            )}
                          </div>
                        </AspectRatio>

                        <div className="p-4">
                          <p className="font-bold text-gray-900 truncate">
                            {draft.coverData?.title || draft.product?.name || 'Borrador'}
                          </p>
                          <p className="text-sm text-gray-400 mt-0.5 truncate">{draft.product?.name || ''}</p>
                        </div>

                        <div className="px-4 pb-4 flex gap-2">
                          <button
                            onClick={() => handleContinueDraft(draft)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {t('draft.continueEditing')}
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={isDeletingDraftId === draft.id}
                            className="p-2 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                            title={t('draft.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                    });
                  })()}
                </div>
              </section>
            )}

            {/* SECCIÓN: Pedidos */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('dashboard.tab.projects')}</h2>
              {orders.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">{t('dashboard.noOrders')}</h3>
                  <p className="text-gray-500 mt-1">{t('dashboard.noOrdersDesc')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {orders.map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    const isCustomAlbum = order.productType === 'custom-album';
                    const productString = String(order.product?.type || order.product?.id || order.product?.name || order.productType || '').toLowerCase();
                    const isCalendar = productString.includes('calendar') || productString.includes('calendario') || order.customization?.year !== undefined;
                    const isMug = productString.includes('mug') || productString.includes('taza');
                    const ProductIcon = isCustomAlbum ? Sparkles : isCalendar ? Calendar : isMug ? Coffee : ImageIcon;
                    const imageUrl = getPreviewImage(order);

                    if (isCustomAlbum) {
                      const orderCode = order.id.slice(0, 8).toUpperCase();
                      const handleContactWhatsApp = () => {
                        const message = `Hola, quiero hacer un Álbum Personalizado. Mi solicitud fue registrada con el código ${orderCode}.`;
                        window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
                      };
                      return (
                        <Card key={order.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white">
                          <div className="relative overflow-hidden">
                            <AspectRatio ratio={1 / 1}>
                              <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                                <Sparkles className="h-12 w-12 text-amber-300" />
                              </div>
                            </AspectRatio>
                            <div className="absolute top-4 right-4">
                              <Badge className={`${statusInfo.className} border-none font-medium px-3 py-1`}>
                                {statusInfo.text}
                              </Badge>
                            </div>
                          </div>

                          <CardHeader className="p-5 pb-2">
                            <div className="flex items-center text-xs text-gray-500 mb-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              {order.createdAt ? t('dashboard.orderDate', { date: format(new Date(order.createdAt), "P", { locale: dateLocale }) }) : t('status.unknown')}
                            </div>
                            <CardTitle className="text-xl font-bold truncate leading-tight">
                              Álbum Personalizado
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="p-5 pt-0 space-y-4">
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              Un curador se pondrá en contacto contigo por WhatsApp para continuar con tu solicitud.
                            </p>
                          </CardContent>

                          <CardFooter className="p-5 pt-0">
                            <button
                              onClick={handleContactWhatsApp}
                              className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Contactar por WhatsApp
                            </button>
                          </CardFooter>
                        </Card>
                      );
                    }

                    return (
                      <Card key={order.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white">
                        <div className="relative overflow-hidden">
                          <AspectRatio ratio={1 / 1}>
                            {imageUrl && !failedImages.has(order.id) ? (
                              <img
                                src={imageUrl}
                                alt={order.coverData?.title || order.product?.name || 'Preview'}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                onError={() => setFailedImages(prev => new Set(prev).add(order.id))}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <ProductIcon className="h-12 w-12 text-gray-300" />
                              </div>
                            )}
                          </AspectRatio>
                          <div className="absolute top-4 right-4">
                            <Badge className={`${statusInfo.className} border-none font-medium px-3 py-1`}>
                              {statusInfo.text}
                            </Badge>
                          </div>
                        </div>

                        <CardHeader className="p-5 pb-2">
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            <Calendar className="h-3 w-3 mr-1" />
                            {order.createdAt ? t('dashboard.orderDate', { date: format(new Date(order.createdAt), "P", { locale: dateLocale }) }) : t('status.unknown')}
                          </div>
                          <CardTitle className="text-xl font-bold truncate leading-tight">
                            {order.coverData?.title || order.product?.name || t('product.album')}
                          </CardTitle>
                          {order.coverData?.subtitle && (
                            <CardDescription className="truncate text-gray-600">
                              {order.coverData.subtitle}
                            </CardDescription>
                          )}
                        </CardHeader>

                        <CardContent className="p-5 pt-0 space-y-4">
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t('dashboard.product')}</p>
                              <p className="text-sm font-medium text-gray-700 truncate">{order.product?.name || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t('dashboard.total')}</p>
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {formatPriceCOP(order.total)}
                              </p>
                            </div>
                          </div>

                          {productString.includes('album') && order.pages && (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center text-sm text-gray-600">
                                <FileText className="h-4 w-4 mr-2 text-primary" />
                                <span>{t('dashboard.totalPages')}</span>
                              </div>
                              <span className="font-bold text-gray-900">{order.pages.length}</span>
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="p-5 pt-0 flex flex-col gap-2">
                          {(order.status === 'paid' || order.status === 'mock_paid') && (
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              {t('dashboard.editOrder')}
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium active:scale-95"
                          >
                            {t('dashboard.viewDetails')}
                          </button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── TAB: Mi Información ── */}
        {activeTab === 'account' && (
          <div className="max-w-2xl space-y-8">

            {/* Datos Personales */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('account.personalInfo')}</h2>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('account.name')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-colors"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName || !nameInput.trim()}
                      className="px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {nameSaved ? <Check className="w-4 h-4" /> : null}
                      {nameSaved ? t('account.nameSaved') : t('account.saveName')}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('account.email')}
                  </label>
                  <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                    {user?.email || '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{t('account.emailNote')}</p>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('account.phone')}
                  </label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <PhoneInput
                        phoneCode={phoneCode}
                        phoneNumber={phoneNumber}
                        onPhoneCodeChange={setPhoneCode}
                        onPhoneNumberChange={setPhoneNumber}
                        label=""
                        inputClassName="py-2 text-sm border-gray-200 focus:ring-black/10 focus:border-gray-400"
                      />
                    </div>
                    <button
                      onClick={handleSavePhone}
                      disabled={isSavingPhone || !phoneNumber.trim()}
                      className="px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {phoneSaved ? <Check className="w-4 h-4" /> : null}
                      {phoneSaved ? t('account.phoneSaved') : t('account.savePhone')}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Seguridad */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Lock className="h-4 w-4 text-gray-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('account.security')}</h2>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">••••••••</p>
                <button
                  onClick={handleSendResetEmail}
                  disabled={isSendingReset || isResetSent}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isResetSent ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">{t('account.resetSent')}</span>
                    </>
                  ) : (
                    t('account.resetPassword')
                  )}
                </button>
              </div>
            </section>

            {/* Direcciones Guardadas */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('account.addresses')}</h2>
              </div>

              {savedAddresses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t('account.noAddresses')}</p>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map(address => (
                    <div key={address.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      {editingAddressId === address.id ? (
                        /* Modo edición */
                        <div className="p-4 space-y-3 bg-gray-50">
                          <div className="grid grid-cols-2 gap-3">
                            {(['name', 'email', 'department', 'city', 'address', 'addressExtra', 'zipCode'] as const).map(field => (
                              <div key={field} className={field === 'address' ? 'col-span-2' : ''}>
                                <label className="block text-xs text-gray-500 mb-1 capitalize">{field}</label>
                                <input
                                  type="text"
                                  value={(addressEditForm as any)[field] || ''}
                                  onChange={e => setAddressEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSaveAddress(address.id)}
                              disabled={isSavingAddress}
                              className="flex-1 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              {t('account.saveAddress')}
                            </button>
                            <button
                              onClick={handleCancelEditAddress}
                              className="px-4 py-2 border border-gray-200 hover:bg-white text-sm text-gray-600 rounded-lg transition-colors"
                            >
                              {t('account.cancelEdit')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Modo vista */
                        <div className="p-4 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{address.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{address.address}{address.addressExtra ? `, ${address.addressExtra}` : ''}</p>
                            <p className="text-xs text-gray-500 truncate">{address.city}{address.department ? `, ${address.department}` : ''}</p>
                            {addressSavedId === address.id && (
                              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                                <Check className="w-3 h-3" />{t('account.addressSaved')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleStartEditAddress(address)}
                              className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                              title={t('account.editAddress')}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              disabled={isDeletingAddressId === address.id}
                              className="p-2 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                              title={t('account.deleteAddress')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Facturación Guardada */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('account.billing')}</h2>
              </div>

              {!savedBillingData ? (
                <p className="text-sm text-gray-400 text-center py-6">{t('account.noBilling')}</p>
              ) : (
                <div className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{savedBillingData.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{savedBillingData.address}</p>
                    <p className="text-xs text-gray-500 truncate">{savedBillingData.city}{savedBillingData.zipCode ? ` — ${savedBillingData.zipCode}` : ''}</p>
                  </div>
                  <button
                    onClick={handleDeleteBilling}
                    disabled={isDeletingBilling}
                    className="p-2 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    title={t('account.deleteBilling')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </section>

          </div>
        )}

        <OrderDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          order={selectedOrder}
        />
      </div>
    </>
  );
};

export default UserDashboard;
