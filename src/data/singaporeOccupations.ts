export interface SingaporeCredentialPreset {
  id: string;
  sector:
    | 'Construction'
    | 'Marine & Shipyard'
    | 'Driving & Logistics'
    | 'Hotel & Restaurant'
    | 'Process & Safety'
    | 'Healthcare & Security';
  name: string;
  issuer: string;
  sampleSkill?: string;
}

export const SINGAPORE_CREDENTIAL_PRESETS: SingaporeCredentialPreset[] = [
  {
    id: 'sg-csoc',
    sector: 'Construction',
    name: 'Apply Workplace Safety & Health in Construction Sites (CSOC)',
    issuer: 'Ministry of Manpower (MOM) Accredited Provider',
    sampleSkill: 'Construction WSH & Risk Assessment',
  },
  {
    id: 'sg-coretrade',
    sector: 'Construction',
    name: 'BCA CoreTrade Registered Tradesman / Foreman',
    issuer: 'Building and Construction Authority (BCA)',
    sampleSkill: 'BCA CoreTrade Standards',
  },
  {
    id: 'sg-bcss',
    sector: 'Construction',
    name: 'Building Construction Supervisors Safety Course (BCSS)',
    issuer: 'MOM Accredited Safety Training Provider',
    sampleSkill: 'Site Safety Supervision & PTW',
  },
  {
    id: 'sg-wah',
    sector: 'Construction',
    name: 'WSQ Perform Work at Height (WAH)',
    issuer: 'SkillsFuture / WSQ Accredited Provider',
    sampleSkill: 'Work at Height Harness & Fall Arrest',
  },
  {
    id: 'sg-msoc',
    sector: 'Marine & Shipyard',
    name: 'Shipyard Safety Instruction Course (SSIC / MSOC)',
    issuer: 'Ministry of Manpower (MOM) / Marine Shipyard',
    sampleSkill: 'Shipyard Hot Work & Confined Space Safety',
  },
  {
    id: 'sg-sssc',
    sector: 'Marine & Shipyard',
    name: 'Supervise Marine Work for WSH (SSSC)',
    issuer: 'MOM Accredited Marine Safety Provider',
    sampleSkill: 'Marine Vessel Drydock Supervision',
  },
  {
    id: 'sg-rigger',
    sector: 'Marine & Shipyard',
    name: 'WSQ Perform Rigger and Signalman Tasks (PRST)',
    issuer: 'SkillsFuture / WSQ Accredited Provider',
    sampleSkill: 'Crane Signalling & Rigging Inspection',
  },
  {
    id: 'sg-scaffold',
    sector: 'Marine & Shipyard',
    name: 'WSQ Erect & Dismantle Metal Scaffold',
    issuer: 'MOM / WSQ Accredited Training Centre',
    sampleSkill: 'Marine & Industrial Metal Scaffolding',
  },
  {
    id: 'sg-class4',
    sector: 'Driving & Logistics',
    name: 'Singapore Class 4 Heavy Motor Vehicle Licence',
    issuer: 'Singapore Traffic Police (SPF)',
    sampleSkill: 'Heavy Lorry & Tipper Operation',
  },
  {
    id: 'sg-class5',
    sector: 'Driving & Logistics',
    name: 'Singapore Class 5 Prime Mover & Heavy Trailer Licence',
    issuer: 'Singapore Traffic Police (SPF)',
    sampleSkill: 'Prime Mover & Container Chassis Hauling',
  },
  {
    id: 'sg-forklift',
    sector: 'Driving & Logistics',
    name: 'WSQ Operate Forklift / Reach Truck Safely',
    issuer: 'SkillsFuture / WSQ Accredited Provider',
    sampleSkill: 'Warehouse Pallet & Container Loading',
  },
  {
    id: 'sg-psa-port',
    sector: 'Driving & Logistics',
    name: 'PSA Port Pass & Prime Mover Yard Safety Clearance',
    issuer: 'PSA Singapore / Jurong Port',
    sampleSkill: 'Port Terminal Container Dispatch',
  },
  {
    id: 'sg-fsc1',
    sector: 'Hotel & Restaurant',
    name: 'WSQ Food Safety Course Level 1 (Basic Food Hygiene)',
    issuer: 'Singapore Food Agency (SFA)',
    sampleSkill: 'SFA Food Hygiene & Kitchen Sanitation',
  },
  {
    id: 'sg-fsc4',
    sector: 'Hotel & Restaurant',
    name: 'WSQ Food Safety Course Level 4 (Food Hygiene Officer)',
    issuer: 'Singapore Food Agency (SFA)',
    sampleSkill: 'F&B HACCP & Kitchen Compliance Management',
  },
  {
    id: 'sg-hospitality',
    sector: 'Hotel & Restaurant',
    name: 'WSQ Hotel Accommodation & Guest Service Operations',
    issuer: 'SkillsFuture Singapore / SHATEC',
    sampleSkill: 'Front Office PMS, Housekeeping & Guest Care',
  },
  {
    id: 'sg-opsoc',
    sector: 'Process & Safety',
    name: 'Oil/Petrochemical Safety Orientation Course (OPSOC)',
    issuer: 'MOM / Jurong Island Accredited Provider',
    sampleSkill: 'Petrochemical Plant Permit-to-Work (PTW)',
  },
  {
    id: 'sg-loto',
    sector: 'Process & Safety',
    name: 'Lockout / Tagout (LOTO) & Confined Space Safety',
    issuer: 'NTUC LearningHub / WSQ',
    sampleSkill: 'Energy Isolation & Gas Testing',
  },
  {
    id: 'sg-snb',
    sector: 'Healthcare & Security',
    name: 'Singapore Nursing Board (SNB) Practising Certificate',
    issuer: 'Singapore Nursing Board',
    sampleSkill: 'Clinical Ward Care & Vital Signs Monitoring',
  },
  {
    id: 'sg-plrd',
    sector: 'Healthcare & Security',
    name: 'PLRD Licensed Security Officer (PWM Certified)',
    issuer: 'Singapore Police Force (PLRD)',
    sampleSkill: 'Access Control, CCTV & Incident Response',
  },
];

export const SINGAPORE_SECTOR_QUICK_SKILLS: Record<string, string[]> = {
  Construction: [
    'Rebar Bending & Formwork',
    'Bricklaying & Plastering',
    'Electrical Wiring (CP5)',
    'Plumbing & Sanitary Installation',
    'BIM / Structural Blueprint Reading',
    'Site Toolbox Briefing',
  ],
  'Marine & Shipyard': [
    'SMAW / MIG / TIG / 6G Pipe Welding',
    'Marine Hull & Plate Fitting',
    'Shipboard Electrical Cabling',
    'Marine Pipe Insulation & Hydrotest',
    'Rigging, Slinging & Crane Signalling',
    'Tubular & Cuplock Scaffolding',
  ],
  'Driving & Logistics': [
    'Class 3 / 4 / 5 Safe Vehicle Inspection',
    'GPS Route Optimization (SG Roads)',
    'Delivery Order & e-POD Verification',
    'Container Prime Mover Port Dispatch',
    'Lorry Crane & Tailgate Handling',
    'Zero Traffic Demerit Record',
  ],
  'Hotel & Restaurant': [
    'Hotel Front Desk & PMS Check-In',
    'VIP Housekeeping & Room Turnaround',
    'Restaurant Floor & Table Service',
    'Commercial Kitchen Prep & Plating',
    'Food Costing, Inventory & Roster Control',
    'POS Billing & Guest Recovery',
  ],
  'Process & Safety': [
    'Valve, Flange & Gasket Maintenance',
    'Plant Preventive Maintenance (CMMS)',
    'Gas Detection & Confined Space Watch',
    'QA/QC NDT Inspection Support',
  ],
  'Healthcare & Security': [
    'Patient Hygiene & Mobility Support',
    'BCLS + AED Emergency Response',
    'Visitor Screening & Patrol Logging',
    'Fire Command Centre Monitoring',
  ],
};
