const fs = require('fs');

const appPath = 'c:/Users/USER/OneDrive/Documents/airflake/src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const newImports = `
import HospitalReferrals from './pages/hospital/Referrals';
import HospitalBloodBank from './pages/hospital/BloodBank';
import HospitalQueue from './pages/hospital/Queue';
import HospitalStaffRoster from './pages/hospital/StaffRoster';
import HospitalInfectionControl from './pages/hospital/InfectionControl';
`;

if (!content.includes('HospitalReferrals')) {
    content = content.replace(
        "import HospitalAmbulanceDispatch from './pages/hospital/AmbulanceDispatch';",
        "import HospitalAmbulanceDispatch from './pages/hospital/AmbulanceDispatch';" + newImports
    );
}

const newRoutes = `
      <Route path="/referrals" element={<HospitalReferrals />} />
      <Route path="/blood-bank" element={<HospitalBloodBank />} />
      <Route path="/queue" element={<HospitalQueue />} />
      <Route path="/staff-roster" element={<HospitalStaffRoster />} />
      <Route path="/infection-control" element={<HospitalInfectionControl />} />
`;

if (!content.includes('path="/referrals"')) {
    content = content.replace(
        '<Route path="/ambulance-dispatch" element={<HospitalAmbulanceDispatch />} />',
        '<Route path="/ambulance-dispatch" element={<HospitalAmbulanceDispatch />} />' + newRoutes
    );
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.jsx updated');
