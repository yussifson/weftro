import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export async function forceDownload(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename || url.split('/').pop() || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("Failed to force download, falling back to window.open", error);
    window.open(url, '_blank');
  }
}


export const isIframe = typeof window !== 'undefined' ? (window.self !== window.top) : false;

export const INDUSTRY_TERMS = {
  law: {
    case: "case",
    cases: "cases",
    client: "client",
    clients: "clients",
    lawyer: "lawyer",
    lawyers: "lawyers",
    staff: "staff",
    matter: "matter",
    matters: "matters",
    intake: "intake",
    pleading: "pleading",
    trial: "trial",
    appeal: "appeal",
    courtName: "court",
    hearing: "hearing",
    hearings: "hearings",
    casesUrl: "/cases",
    clientsUrl: "/clients"},
  school: {
    case: "class",
    cases: "classes",
    client: "student",
    clients: "students",
    lawyer: "teacher",
    lawyers: "teachers",
    staff: "staff",
    matter: "class",
    matters: "classes",
    intake: "admission",
    pleading: "curriculum",
    trial: "exam",
    appeal: "grade review",
    courtName: "classroom",
    hearing: "session",
    hearings: "sessions",
    casesUrl: "/classes",
    clientsUrl: "/students"},
  hospital: {
    case: "appointment",
    cases: "appointments",
    client: "patient",
    clients: "patients",
    lawyer: "doctor",
    lawyers: "doctors",
    staff: "medical staff",
    matter: "appointment",
    matters: "appointments",
    intake: "triage",
    pleading: "diagnosis",
    trial: "treatment",
    appeal: "discharge",
    courtName: "room",
    hearing: "appointment",
    hearings: "appointments",
    casesUrl: "/appointments",
    clientsUrl: "/patients"},
  hotel: {
    case: "room",
    cases: "rooms",
    client: "guest",
    clients: "guests",
    lawyer: "receptionist",
    lawyers: "staff",
    staff: "hotel staff",
    matter: "reservation",
    matters: "reservations",
    intake: "check-in",
    pleading: "housekeeping",
    trial: "stay",
    appeal: "check-out",
    courtName: "room",
    hearing: "booking",
    hearings: "bookings",
    casesUrl: "/rooms",
    clientsUrl: "/guests"},
  retail: {
    case: "order",
    cases: "orders",
    client: "customer",
    clients: "customers",
    lawyer: "cashier",
    lawyers: "staff",
    staff: "store staff",
    matter: "order",
    matters: "orders",
    intake: "cart",
    pleading: "checkout",
    trial: "delivery",
    appeal: "return",
    courtName: "register",
    hearing: "transaction",
    hearings: "transactions",
    casesUrl: "/orders",
    clientsUrl: "/customers"}
};

export function getTerm(key, industry = "law", capitalize = false) {
  const terms = INDUSTRY_TERMS[industry] || INDUSTRY_TERMS.law;
  let term = terms[key] || INDUSTRY_TERMS.law[key] || key;
  if (capitalize) {
    if (term.includes(' ')) {
      term = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
      term = term.charAt(0).toUpperCase() + term.slice(1);
    }
  }
  return term;
}
