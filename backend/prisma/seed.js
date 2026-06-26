const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.template.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hash,
      name: 'Admin',
      studioName: 'Photo Studio',
      studioAddress: 'Jakarta, Indonesia',
      studioPhone: '+628123456789'
    }
  });

  await prisma.setting.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      paymentMethods: JSON.stringify(['bank', 'qris', 'cash']),
      bankAccounts: JSON.stringify([
        { bank: 'BCA', number: '1234567890', name: 'Photo Studio' },
        { bank: 'Mandiri', number: '0987654321', name: 'Photo Studio' }
      ]),
      eventTypes: JSON.stringify(['Wedding', 'Pre-wedding', 'Portrait', 'Event', 'Commercial', 'Product'])
    }
  });

  const services = [
    {
      name: 'Wedding Full Day',
      description: 'Full day wedding photography & videography coverage. Includes 2 photographers, 1 videographer, same day edit, album 40 pages.',
      price: 15000000,
      discountPrice: 18000000,
      durationHours: 12,
      durationMinutes: 0,
      photoEditCount: 200,
      category: 'main',
      eventTypes: JSON.stringify(['Wedding']),
      city: 'Jakarta, Depok, Tangerang, Bekasi',
      additionalCosts: JSON.stringify([
        { type: 'transport', amount: 500000, description: 'Transport luar kota' },
        { type: 'ticket', amount: 200000, description: 'Tiket masuk area foto' }
      ])
    },
    {
      name: 'Wedding Half Day',
      description: 'Half day wedding photography coverage. Includes 1 photographer, album 20 pages.',
      price: 8000000,
      discountPrice: null,
      durationHours: 6,
      durationMinutes: 0,
      photoEditCount: 100,
      category: 'main',
      eventTypes: JSON.stringify(['Wedding']),
      city: 'Jakarta, Depok',
      additionalCosts: JSON.stringify([
        { type: 'transport', amount: 300000, description: 'Transport luar kota' }
      ])
    },
    {
      name: 'Pre-wedding Outdoor',
      description: 'Pre-wedding photography session outdoor. 3 lokasi, 1 set baju, album 20 pages.',
      price: 5000000,
      discountPrice: 6500000,
      durationHours: 4,
      durationMinutes: 30,
      photoEditCount: 80,
      category: 'main',
      eventTypes: JSON.stringify(['Pre-wedding']),
      city: 'Jakarta, Bogor, Bandung',
      additionalCosts: JSON.stringify([
        { type: 'ticket', amount: 150000, description: 'Tiket masuk lokasi foto' }
      ])
    },
    {
      name: 'Portrait Session',
      description: 'Individual atau family portrait. 1 set baju, background studio.',
      price: 2000000,
      discountPrice: null,
      durationHours: 2,
      durationMinutes: 0,
      photoEditCount: 30,
      category: 'main',
      eventTypes: JSON.stringify(['Portrait']),
      city: 'Jakarta',
      additionalCosts: JSON.stringify([])
    },
    {
      name: 'Event Documentation',
      description: 'Event photography coverage untuk acara seminar, workshop, gathering.',
      price: 3500000,
      discountPrice: 4000000,
      durationHours: 4,
      durationMinutes: 0,
      photoEditCount: 50,
      category: 'main',
      eventTypes: JSON.stringify(['Event', 'Commercial']),
      city: 'Jakarta, Tangerang, Bekasi',
      additionalCosts: JSON.stringify([
        { type: 'transport', amount: 250000, description: 'Transport ke lokasi' }
      ])
    },
    {
      name: 'Extra Album',
      description: 'Tambahan album cetak 20 pages',
      price: 500000,
      discountPrice: null,
      durationHours: 0,
      durationMinutes: 0,
      photoEditCount: 0,
      category: 'addon',
      eventTypes: JSON.stringify(['Wedding', 'Pre-wedding', 'Portrait']),
      city: null,
      additionalCosts: JSON.stringify([])
    },
    {
      name: 'Drone Shot',
      description: 'Aerial drone photography & videography untuk dokumentasi udara.',
      price: 1500000,
      discountPrice: null,
      durationHours: 1,
      durationMinutes: 0,
      photoEditCount: 0,
      category: 'addon',
      eventTypes: JSON.stringify(['Wedding', 'Pre-wedding', 'Event']),
      city: null,
      additionalCosts: JSON.stringify([])
    },
    {
      name: 'Same Day Edit Video',
      description: 'Video highlight edited langsung hari H.',
      price: 2000000,
      discountPrice: 2500000,
      durationHours: 0,
      durationMinutes: 0,
      photoEditCount: 0,
      category: 'addon',
      eventTypes: JSON.stringify(['Wedding']),
      city: null,
      additionalCosts: JSON.stringify([])
    }
  ];

  for (let i = 0; i < services.length; i++) {
    await prisma.service.create({ data: { ...services[i], userId: user.id, sortOrder: i + 1 } });
  }

  const teamMembers = [
    { name: 'Andi Photographer', role: 'Photographer', phone: '+628111111111', tags: JSON.stringify(['lead']) },
    { name: 'Budi Videographer', role: 'Videographer', phone: '+628222222222', tags: JSON.stringify(['lead']) },
    { name: 'Citra Editor', role: 'Editor', phone: '+628333333333', tags: JSON.stringify(['editor']) },
    { name: 'Dina Assistant', role: 'Assistant', phone: '+628444444444', tags: JSON.stringify(['assistant']) }
  ];

  for (let i = 0; i < teamMembers.length; i++) {
    await prisma.teamMember.create({ data: { ...teamMembers[i], userId: user.id, sortOrder: i + 1 } });
  }

  const statuses = ['pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled'];
  const eventTypes = ['Wedding', 'Pre-wedding', 'Portrait', 'Event'];
  const clients = [
    { name: 'Rina & Dewa', email: 'rina@email.com', phone: '+628555555555' },
    { name: 'Sari Family', email: 'sari@email.com', phone: '+628666666666' },
    { name: 'Toko Maju', email: 'maju@email.com', phone: '+628777777777' },
    { name: 'Putri & Andika', email: 'putri@email.com', phone: '+628888888888' },
    { name: 'CV Bersama', email: 'bersama@email.com', phone: '+628999999999' }
  ];

  for (let i = 0; i < 10; i++) {
    const client = clients[i % clients.length];
    const event = eventTypes[i % eventTypes.length];
    const status = statuses[i % statuses.length];
    const price = 2000000 + Math.floor(Math.random() * 13000000);
    const dp = Math.floor(price * 0.3);
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 60) - 10);

    await prisma.booking.create({
      data: {
        userId: user.id,
        bookingCode: `BK-${String(1000 + i).slice(1)}${String.fromCharCode(65 + i)}${String.fromCharCode(65 + (i * 3) % 26)}`,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        eventType: event,
        sessionDate: date,
        sessionTime: `${9 + (i % 8)}:00`,
        location: 'Studio Photo Jakarta',
        packageName: services[i % 5].name,
        packagePrice: price,
        totalAmount: price,
        dpAmount: dp,
        dpPaid: status !== 'pending',
        finalPaid: status === 'completed',
        status,
        notes: i % 3 === 0 ? 'Special request: outdoor location' : null,
        deadline: new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000)
      }
    });
  }

  await prisma.template.create({
    data: {
      userId: user.id,
      name: 'Booking Confirmation',
      type: 'whatsapp',
      content: 'Halo {clientName}! Booking {bookingCode} untuk {eventType} pada {sessionDate} sudah dikonfirmasi. Terima kasih!',
      variables: JSON.stringify(['clientName', 'bookingCode', 'eventType', 'sessionDate'])
    }
  });

  await prisma.template.create({
    data: {
      userId: user.id,
      name: 'DP Invoice',
      type: 'whatsapp',
      content: 'Halo {clientName}! Invoice DP untuk booking {bookingCode} sebesar Rp{dpAmount}. Silakan lakukan pembayaran. Terima kasih!',
      variables: JSON.stringify(['clientName', 'bookingCode', 'dpAmount'])
    }
  });

  console.log('Seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
