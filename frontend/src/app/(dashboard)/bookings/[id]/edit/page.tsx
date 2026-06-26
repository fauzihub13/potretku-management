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
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventType: "",
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
    Promise.all([
      api.get(`/bookings/${params.id}`),
      api.get("/services"),
      api.get("/team"),
    ])
      .then(([b, s, t]) => {
        const d = b.data;
        const matched = s.data.find((sv: any) => sv.name === d.packageName);
        setSelectedServiceId(matched?.id || "");
        setForm({
          clientName: d.clientName,
          clientEmail: d.clientEmail || "",
          clientPhone: d.clientPhone || "",
          eventType: d.eventType,
          sessionDate: d.sessionDate?.split("T")[0] || "",
          sessionTime: d.sessionTime || "",
          location: d.location || "",
          packageName: d.packageName,
          packagePrice: d.packagePrice,
          totalAmount: d.totalAmount,
          dpAmount: d.dpAmount,
          notes: d.notes || "",
          freelancerId: d.freelancerId || "",
          driveAllPhotos: d.driveAllPhotos || "",
          driveRawPhotos: d.driveRawPhotos || "",
          driveEditedPhotos: d.driveEditedPhotos || "",
        });
        setServices(s.data);
        setTeam(t.data);
      })
      .finally(() => setFetching(false));
  }, [params.id]);

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
    setLoading(true);
    try {
      await api.put(`/bookings/${params.id}`, form);
      toast.success("Pemesanan diperbarui");
      router.push(`/bookings/${params.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  if (fetching)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Pemesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nama Klien *</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => update("clientName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  value={form.clientPhone}
                  onChange={(e) => update("clientPhone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => update("clientEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Acara</Label>
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
                <Label>Paket</Label>
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
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    {team.filter(t => t.isActive).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={form.sessionDate}
                  onChange={(e) => update("sessionDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Jam Mulai *</Label>
                <Select
                  value={form.sessionTime}
                  onValueChange={(v) => update("sessionTime", v || "")}
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
                  onChange={(e) =>
                    update("totalAmount", Number(e.target.value))
                  }
                />
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
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
