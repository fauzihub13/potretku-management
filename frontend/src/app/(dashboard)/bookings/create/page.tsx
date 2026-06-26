"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { validateName, validatePhone, validateEmail, validateDate, validateTime, validateNumber } from "@/lib/validations";

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function addMinutes(time: string, hours: number, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + hours * 60 + minutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function CreateBookingPage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventType: "Wedding",
    sessionDate: "",
    sessionTime: "",
    location: "",
    packageName: "",
    packagePrice: 0,
    totalAmount: 0,
    dpAmount: 0,
    notes: "",
    freelancerId: "",
    driveAllPhotos: "",
    driveRawPhotos: "",
    driveEditedPhotos: "",
  });

  useEffect(() => {
    Promise.all([api.get("/services"), api.get("/team")]).then(([s, t]) => {
      setServices(s.data);
      setTeam(t.data);
    });
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId],
  );

  const endTime = useMemo(() => {
    if (!selectedService || !form.sessionTime) return null;
    return addMinutes(
      form.sessionTime,
      selectedService.durationHours || 0,
      selectedService.durationMinutes || 0,
    );
  }, [form.sessionTime, selectedService]);

  const durationText = useMemo(() => {
    if (!selectedService) return "";
    const h = selectedService.durationHours || 0;
    const m = selectedService.durationMinutes || 0;
    if (h === 0 && m === 0) return "";
    return `${h}j ${m}m`;
  }, [selectedService]);

  const handleServiceSelect = (serviceId: string | null) => {
    if (!serviceId) return;
    const s = services.find((s) => s.id === serviceId);
    if (s) {
      setSelectedServiceId(serviceId);
      setForm((f) => ({
        ...f,
        packageName: s.name,
        packagePrice: s.price,
        totalAmount: s.price,
        dpAmount: Math.round(s.price * 0.3),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const nameErr = validateName(form.clientName, 'Nama klien');
    if (nameErr) newErrors.clientName = nameErr;
    if (form.clientPhone) {
      const phoneErr = validatePhone(form.clientPhone);
      if (phoneErr) newErrors.clientPhone = phoneErr;
    }
    if (form.clientEmail) {
      const emailErr = validateEmail(form.clientEmail);
      if (emailErr) newErrors.clientEmail = emailErr;
    }
    const dateErr = validateDate(form.sessionDate, 'Tanggal sesi');
    if (dateErr) newErrors.sessionDate = dateErr;
    if (form.sessionTime) {
      const timeErr = validateTime(form.sessionTime);
      if (timeErr) newErrors.sessionTime = timeErr;
    }
    const amountErr = validateNumber(form.totalAmount, 'Total', 0);
    if (amountErr) newErrors.totalAmount = amountErr;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setLoading(true);
    try {
      await api.post("/bookings", form);
      toast.success("Pemesanan berhasil dibuat");
      router.push("/bookings");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuat pemesanan");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Tambah Pemesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nama Klien *</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => { update("clientName", e.target.value); if (errors.clientName) setErrors(prev => { const { clientName: _, ...rest } = prev; return rest; }); }}
                  required
                />
                {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  value={form.clientPhone}
                  onChange={(e) => { update("clientPhone", e.target.value); if (errors.clientPhone) setErrors(prev => { const { clientPhone: _, ...rest } = prev; return rest; }); }}
                />
                {errors.clientPhone && <p className="text-xs text-red-500 mt-1">{errors.clientPhone}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => { update("clientEmail", e.target.value); if (errors.clientEmail) setErrors(prev => { const { clientEmail: _, ...rest } = prev; return rest; }); }}
                />
                {errors.clientEmail && <p className="text-xs text-red-500 mt-1">{errors.clientEmail}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jenis Acara *</Label>
                <Select
                  value={form.eventType}
                  onValueChange={(v) => update("eventType", v || "")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Wedding",
                      "Pre-wedding",
                      "Portrait",
                      "Event",
                      "Commercial",
                      "Product",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paket *</Label>
                <Select
                  value={selectedServiceId}
                  onValueChange={handleServiceSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      .filter((s) => s.category === "main")
                      .map((s) => {
                        const h = s.durationHours || 0;
                        const m = s.durationMinutes || 0;
                        const dur = h || m ? ` (${h}j ${m}m)` : "";
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {dur} - Rp{s.price.toLocaleString()}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Freelancer</Label>
                <Select
                  value={form.freelancerId}
                  onValueChange={(v) => update("freelancerId", v || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih freelancer" />
                  </SelectTrigger>
                  <SelectContent>
                    {team.filter(t => t.isActive).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Sesi *</Label>
                <Input
                  type="date"
                  value={form.sessionDate}
                  onChange={(e) => { update("sessionDate", e.target.value); if (errors.sessionDate) setErrors(prev => { const { sessionDate: _, ...rest } = prev; return rest; }); }}
                  required
                />
                {errors.sessionDate && <p className="text-xs text-red-500 mt-1">{errors.sessionDate}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jam Mulai *</Label>
                <Select
                  value={form.sessionTime}
                  onValueChange={(v) => { update("sessionTime", v || ""); if (errors.sessionTime) setErrors(prev => { const { sessionTime: _, ...rest } = prev; return rest; }); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jam mulai" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {timeSlots.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sessionTime && <p className="text-xs text-red-500 mt-1">{errors.sessionTime}</p>}
              </div>

              <div className="space-y-2">
                <Label>Lokasi</Label>
                <Input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Total (Rp)</Label>
                <Input
                  type="number"
                  value={form.totalAmount}
                  onChange={(e) => { update("totalAmount", Number(e.target.value)); if (errors.totalAmount) setErrors(prev => { const { totalAmount: _, ...rest } = prev; return rest; }); }}
                />
                {errors.totalAmount && <p className="text-xs text-red-500 mt-1">{errors.totalAmount}</p>}
              </div>
              <div className="space-y-2">
                <Label>DP (Rp)</Label>
                <Input
                  type="number"
                  value={form.dpAmount}
                  onChange={(e) => update("dpAmount", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
              />
            </div>

            {/* Link Google Drive */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
              <p className="text-sm font-medium mb-3">
                Link Google Drive{" "}
                <span className="text-zinc-400 font-normal">
                  (isi setelah sesi foto)
                </span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Semua Foto</Label>
                  <Input
                    value={form.driveAllPhotos || ""}
                    onChange={(e) => update("driveAllPhotos", e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Foto RAW</Label>
                  <Input
                    value={form.driveRawPhotos || ""}
                    onChange={(e) => update("driveRawPhotos", e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Foto Edited</Label>
                  <Input
                    value={form.driveEditedPhotos || ""}
                    onChange={(e) =>
                      update("driveEditedPhotos", e.target.value)
                    }
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Buat Pemesanan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
