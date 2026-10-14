// ⚠️ Demo-only data. Every doctor, hospital and ambulance below is fictional
// and exists only so this college/portfolio project has something to show.

const doctors = [
  {name:"Dr. Aarav Mehta", specialty:"General Physician", hospital:"City Care Hospital", eta:"Available now", initials:"AM"},
  {name:"Dr. Priya Sharma", specialty:"Cardiologist", hospital:"Care Heart Centre", eta:"Available in 10 min", initials:"PS"},
  {name:"Dr. Rohan Verma", specialty:"Orthopedic", hospital:"LifeLine Hospital", eta:"Available now", initials:"RV"},
  {name:"Dr. Neha Patel", specialty:"Dermatologist", hospital:"City Care Hospital", eta:"Available in 15 min", initials:"NP"},
  {name:"Dr. Kabir Singh", specialty:"Pediatrician", hospital:"Sunrise Medical Centre", eta:"Available now", initials:"KS"},
  {name:"Dr. Simran Kaur", specialty:"Gynecologist", hospital:"Care Heart Centre", eta:"Available in 20 min", initials:"SK"}
];

const hospitals = [
  {name:"City Care Hospital",services:"Emergency • ICU • General Medicine",status:"Open 24×7",beds:"12 beds available",eta:"1.8 km · 8 min"},
  {name:"Government General Hospital",services:"Emergency • General • Diagnostics",status:"Open 24×7",beds:"8 beds available",eta:"2.4 km · 11 min"},
  {name:"LifeLine Multispeciality",services:"Cardiology • Orthopedics • ICU",status:"Open",beds:"5 beds available",eta:"3.1 km · 14 min"},
  {name:"Sunrise Medical Centre",services:"Pediatrics • General Medicine",status:"Open",beds:"3 beds available",eta:"1.6 km · 7 min"}
];

const ambulances = [
  {id:"CC-AMB-104", driver:"Sanjay Rane", eta:"6 min", distance:"2.1 km"},
  {id:"CC-AMB-217", driver:"Imran Shaikh", eta:"8 min", distance:"3.0 km"},
  {id:"CC-AMB-330", driver:"Vikas Pawar", eta:"11 min", distance:"4.4 km"}
];

// Demo-only reviews shown on the home page. Feel free to edit or add more.
let reviews = [
  {name:"Ananya Joshi", initials:"AJ", rating:5, text:"Booking a doctor took under a minute and the ambulance ETA feature is such a nice touch for a project demo."},
  {name:"Rahul Deshmukh", initials:"RD", rating:4, text:"Clean layout, works great on mobile too. Would love to see live doctor chat next!"},
  {name:"Meera Kulkarni", initials:"MK", rating:5, text:"The emergency SOS screen feels genuinely reassuring — great execution for a college project."}
];
