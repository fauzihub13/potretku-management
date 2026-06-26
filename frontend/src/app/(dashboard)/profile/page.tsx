'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Lock, Store, Save, Camera, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profile, setProfile] = useState({
    name: '', email: '', avatar: '', studioName: '', studioAddress: '', studioPhone: '', studioLogo: ''
  });

  const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setProfile({
        name: res.data.name || '',
        email: res.data.email || '',
        avatar: res.data.avatar || '',
        studioName: res.data.studioName || '',
        studioAddress: res.data.studioAddress || '',
        studioPhone: res.data.studioPhone || '',
        studioLogo: res.data.studioLogo || ''
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', profile);
      toast.success('Profil berhasil diperbarui');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.newPass !== password.confirm) return toast.error('Konfirmasi password tidak cocok');
    if (password.newPass.length < 6) return toast.error('Password baru minimal 6 karakter');
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword: password.current, newPassword: password.newPass });
      toast.success('Password berhasil diubah');
      setPassword({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Avatar & Nama */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl font-bold text-purple-700 dark:text-purple-300 overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.name || 'Nama Anda'}</h2>
              <p className="text-sm text-zinc-500">{profile.email}</p>
              <Badge className="mt-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {authUser?.plan === 'basic' ? 'Basic' : authUser?.plan === 'plus' ? 'Plus' : 'Pro'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informasi Akun */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={profile.email} disabled className="bg-zinc-50 dark:bg-zinc-800" />
                <p className="text-xs text-zinc-400">Email tidak dapat diubah</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informasi Studio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> Informasi Studio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Studio</Label>
                <Input value={profile.studioName} onChange={e => setProfile(p => ({ ...p, studioName: e.target.value }))} placeholder="Photo Studio Jakarta" />
              </div>
              <div className="space-y-2">
                <Label>Telepon Studio</Label>
                <Input value={profile.studioPhone} onChange={e => setProfile(p => ({ ...p, studioPhone: e.target.value }))} placeholder="+628123456789" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat Studio</Label>
              <Textarea value={profile.studioAddress} onChange={e => setProfile(p => ({ ...p, studioAddress: e.target.value }))} rows={2} placeholder="Jl. Contoh No. 123, Jakarta Selatan" />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={profile.studioLogo} onChange={e => setProfile(p => ({ ...p, studioLogo: e.target.value }))} placeholder="https://..." />
              {profile.studioLogo && (
                <div className="mt-2">
                  <img src={profile.studioLogo} alt="Logo" className="h-12 w-12 object-contain rounded border" />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan Studio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Ubah Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Ubah Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Password Saat Ini</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={password.current}
                  onChange={e => setPassword(p => ({ ...p, current: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password Baru</Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={password.newPass}
                    onChange={e => setPassword(p => ({ ...p, newPass: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Konfirmasi Password Baru</Label>
                <Input
                  type="password"
                  value={password.confirm}
                  onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={changingPassword}>
                <Lock className="h-4 w-4 mr-2" /> {changingPassword ? 'Mengubah...' : 'Ubah Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Akun */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Paket Berlangganan</span>
            <Badge className="bg-purple-100 text-purple-700">{authUser?.plan?.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-zinc-500">Role</span>
            <span className="font-medium capitalize">{authUser?.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
