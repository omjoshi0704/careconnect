// seed.js — runs ONCE automatically when the database file doesn't exist yet.
// Fills in real, publicly-known Nanded hospitals (name/address/phone only —
// no invented bed counts, since no public source gives real-time bed data)
// plus one demo login for every role so the app is usable immediately.
"use strict";
const { hashPassword } = require("./lib/auth");

module.exports = function seed(db) {
  // ---------- real Nanded hospitals (name / address / phone where publicly known) ----------
  const hospitals = [
    { name: "Dr. Shankarrao Chavan Government Medical College & Hospital", address: "Vishnupuri, Nanded, Maharashtra 431606", phone: "02462-229272", type: "Government", note: "750-bed tertiary govt. hospital; has a blood bank. Contact hospital directly for current bed availability." },
    { name: "Government Women's Hospital", address: "College Road, Shyam Nagar, Nanded, Maharashtra 431605", phone: "", type: "Government", note: "Contact hospital directly for current bed availability." },
    { name: "S.G.G.S Memorial Government Hospital", address: "Railway Station Road, Vazirabad, Nanded, Maharashtra 431601", phone: "", type: "Government", note: "Contact hospital directly for current bed availability." },
    { name: "Bokare Hospital", address: "Doctor Lane, Nanded", phone: "", type: "Private", note: "Multispeciality." },
    { name: "Umrekar Multispeciality Hospital", address: "Opp. Kalamandir, Nanded", phone: "", type: "Private", note: "Multispeciality." },
    { name: "Sanjeevani Hospital", address: "Shivaji Nagar, Nanded", phone: "", type: "Private", note: "General hospital." },
    { name: "Bhaskar Hospital", address: "Govardhan Ghat Road, Vazirabad, Nanded, Maharashtra 431601", phone: "+91 9823208717", type: "Private", note: "General hospital." },
    { name: "Chintamani Superspeciality Hospital", address: "Narsinha Bharosa Heights, Bus Stand Road, Nanded, Maharashtra 431601", phone: "9960678176", type: "Private", note: "Superspeciality." },
    { name: "Sunrise Global Superspeciality Hospital", address: "Vishnu Nagar, Nanded", phone: "", type: "Private", note: "Superspeciality." },
    { name: "Ankur Superspecialty Women's Hospital", address: "Harsh Nagar, Nanded", phone: "", type: "Private", note: "Women's hospital." },
    { name: "Surya Children Hospital & Care Centre", address: "Vazirabad, Nanded, Maharashtra 431601", phone: "+91 7385100510", type: "Private", note: "Pediatric care." },
    { name: "Lavekar Hospital", address: "Subhash Road, Barbada, Nanded", phone: "", type: "Private", note: "General hospital." },
    { name: "City Hospital", address: "Mahaveer Society Road, Wadia Factory, Shivaji Nagar, Nanded", phone: "9823385538", type: "Private", note: "General surgery & medicine." },
    { name: "Asha Hospital", address: "Parimal Nagar, Kabra Nagar Road, Nanded", phone: "7744028366", type: "Private", note: "General surgery, paediatrics, orthopaedics." },
    { name: "Ashtavinayak Hospital and ICU", address: "3-1-291/1, Doctor Lane, Nanded, Maharashtra 431601", phone: "9662521080", type: "Private", note: "Paediatrics, orthopaedics, general medicine." },
    { name: "Shri Sai Gajanan Hospital", address: "Kinwat Road, Mahur, Nanded, Maharashtra 431721", phone: "9834150126", type: "Private", note: "General hospital." },
    { name: "Vivekanand Bal Rugnalya", address: "Near Bus Stand, Doctor Lane, Nanded", phone: "9822864070", type: "Private", note: "Children's hospital." }
  ];
  const insertHospital = db.prepare("INSERT INTO hospitals (name,address,phone,type,note) VALUES (?,?,?,?,?)");
  const hospitalIds = {};
  for (const h of hospitals) {
    const info = insertHospital.run(h.name, h.address, h.phone, h.type, h.note);
    hospitalIds[h.name] = Number(info.lastInsertRowid);
  }

  // ---------- helper to create a user + role profile ----------
  const insertUser = db.prepare(
    "INSERT INTO users (role,name,phone,password_hash,password_salt) VALUES (?,?,?,?,?)"
  );
  function createUser(role, name, phone, password) {
    const { hash, salt } = hashPassword(password);
    const info = insertUser.run(role, name, phone, hash, salt);
    return Number(info.lastInsertRowid);
  }

  // ---------- one demo account per role (password for all demo logins: demo1234) ----------
  const demoPassword = "demo1234";

  // Patient
  createUser("patient", "Demo Patient", "9000000001", demoPassword);

  // Doctors (linked to real hospitals above)
  const doctorDefs = [
    { name: "Dr. Aarav Mehta", phone: "9000000010", specialty: "General Physician", hospital: "Sanjeevani Hospital" },
    { name: "Dr. Priya Sharma", phone: "9000000011", specialty: "Cardiologist", hospital: "Chintamani Superspeciality Hospital" },
    { name: "Dr. Rohan Verma", phone: "9000000012", specialty: "Orthopedic", hospital: "Bokare Hospital" },
    { name: "Dr. Neha Patel", phone: "9000000013", specialty: "Gynecologist", hospital: "Ankur Superspecialty Women's Hospital" },
    { name: "Dr. Kabir Singh", phone: "9000000014", specialty: "Pediatrician", hospital: "Surya Children Hospital & Care Centre" }
  ];
  const insertDoctor = db.prepare("INSERT INTO doctors (user_id,specialty,hospital_id,available) VALUES (?,?,?,?)");
  doctorDefs.forEach((d, i) => {
    const uid = createUser("doctor", d.name, d.phone, demoPassword);
    insertDoctor.run(uid, d.specialty, hospitalIds[d.hospital] || null, i === 0 ? 1 : 0); // first doctor demo = available
  });

  // Ambulance drivers
  const driverDefs = [
    { name: "Sanjay Rane", phone: "9000000020", vehicle: "MH26 AB 1234", area: "Vazirabad" },
    { name: "Imran Shaikh", phone: "9000000021", vehicle: "MH26 CD 5678", area: "Shivaji Nagar" },
    { name: "Vikas Pawar", phone: "9000000022", vehicle: "MH26 EF 9012", area: "CIDCO" }
  ];
  const insertDriver = db.prepare("INSERT INTO drivers (user_id,vehicle_number,area,available) VALUES (?,?,?,?)");
  driverDefs.forEach((d, i) => {
    const uid = createUser("driver", d.name, d.phone, demoPassword);
    insertDriver.run(uid, d.vehicle, d.area, i === 0 ? 1 : 0); // first driver demo = online/available
  });

  // Pharmacy
  const pharmUid = createUser("pharmacy", "HealthPlus Pharmacy", "9000000030", demoPassword);
  const pharmInfo = db.prepare("INSERT INTO pharmacies (user_id,shop_name,address) VALUES (?,?,?)")
    .run(pharmUid, "HealthPlus Pharmacy", "Vazirabad, Nanded");
  const pharmacyId = Number(pharmInfo.lastInsertRowid);
  const insertMed = db.prepare("INSERT INTO pharmacy_medicines (pharmacy_id,medicine_name,stock_qty,price) VALUES (?,?,?,?)");
  [["Paracetamol 500mg", 120, 25], ["Azithromycin 500mg", 40, 85], ["Cetirizine 10mg", 90, 15], ["ORS Sachet", 200, 20]]
    .forEach(([n, q, p]) => insertMed.run(pharmacyId, n, q, p));

  // Blood bank
  const bbUid = createUser("bloodbank", "Nanded City Blood Bank", "9000000040", demoPassword);
  const bbInfo = db.prepare("INSERT INTO blood_banks (user_id,bank_name,address) VALUES (?,?,?)")
    .run(bbUid, "Nanded City Blood Bank", "Near Civil Hospital, Nanded");
  const bloodBankId = Number(bbInfo.lastInsertRowid);
  const insertBlood = db.prepare("INSERT INTO blood_stock (blood_bank_id,blood_group,units_available) VALUES (?,?,?)");
  [["A+", 12], ["A-", 3], ["B+", 9], ["B-", 2], ["O+", 20], ["O-", 4], ["AB+", 5], ["AB-", 1]]
    .forEach(([g, u]) => insertBlood.run(bloodBankId, g, u));

  // A couple of starter reviews
  db.prepare("INSERT INTO reviews (name,rating,review_text) VALUES (?,?,?)").run(
    "Ananya Joshi", 5, "Booking a doctor took under a minute and the ambulance ETA feature is a great touch."
  );
  db.prepare("INSERT INTO reviews (name,rating,review_text) VALUES (?,?,?)").run(
    "Rahul Deshmukh", 4, "Clean and works great on mobile too. Would love live doctor chat next!"
  );

  console.log("Seed complete: demo logins use password 'demo1234' for every role.");
};
