import { supabase } from '@/api/supabaseClient';
import { powerSync } from '@/api/PowerSyncConnector';
import { getSubdomainAndBase } from '@/lib/domainUtils';

export function cleanLogo(url) {
  if (!url) return url;
  let finalUrl = url.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('/') && !finalUrl.startsWith('data:')) {
    finalUrl = 'https://' + finalUrl;
  }
  if (finalUrl.lastIndexOf('http') > 0) {
    const secondHttp = finalUrl.lastIndexOf('http');
    if (finalUrl.substring(0, secondHttp).includes('=')) {
      finalUrl = finalUrl.substring(secondHttp);
    }
  }
  return finalUrl;
}

export async function fetchCompanyBrandingFromDomain() {
  const { currentSubdomain, isCustomDomain } = getSubdomainAndBase();
  const isRootAccount = typeof window !== 'undefined' && (
    window.location.hostname.startsWith('account.') || 
    window.location.hostname === 'optavel.com' || 
    window.location.hostname === 'slate.optavel.com'
  );

  if (!currentSubdomain || isRootAccount) {
    return { company: null, isCustomDomain: false, hasCustomCompany: false };
  }

  const cleanSub = currentSubdomain.toLowerCase().trim();
  let brandData = null;

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_by_subdomain', { p_subdomain: cleanSub });
    if (!rpcError && rpcData) {
      brandData = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    }
  } catch (e) {}

  if (!brandData) {
    try {
      const { data: directData } = await supabase
        .from('companies')
        .select('id, name, logo_url, logo_light_url, tagline, industry_type, primary_color, subdomain, custom_domain')
        .or(`subdomain.ilike.${cleanSub},custom_domain.ilike.${cleanSub}`)
        .maybeSingle();
      if (directData) brandData = directData;
    } catch (e) {}
  }

  if (!brandData) {
    try {
      const res = await powerSync.execute(
        'SELECT id, name, logo_url, logo_light_url, tagline, industry_type, primary_color, subdomain, custom_domain FROM companies WHERE LOWER(subdomain) = ? OR LOWER(custom_domain) = ? LIMIT 1',
        [cleanSub, cleanSub]
      );
      if (res.rows?._array?.[0]) brandData = res.rows._array[0];
    } catch (e) {}
  }

  return {
    company: brandData,
    isCustomDomain: isCustomDomain || !!brandData,
    hasCustomCompany: !!brandData
  };
}

export function getIndustryFeatures(industryType, companyName = 'Workspace') {
  const ind = ((industryType || '') + ' ' + (companyName || '')).toLowerCase().trim();

  if (ind.includes('real_estate_jcl') || ind.includes('jcl')) {
    return {
      badge: "JCL Office",
      title: `Powered by ${companyName}`,
      subtitle: "Integrated land registry, pre-sale allocations, client relationship management, and property operations.",
      features: [
        {
          icon: "Compass",
          title: "Land & Cadastral Registry",
          desc: "GPS coordinates, survey plan numbers, deed types (C of O, Freehold), and co-ownership records."
        },
        {
          icon: "Layers",
          title: "Pre-Sale Land Allocation",
          desc: "Plot reservation engine, flexible installment plans, deposit tracking, and automated allocation."
        },
        {
          icon: "Users",
          title: "Client CRM & Timeline",
          desc: "Unified customer history across property viewings, inquiries, purchase offers, and closed deals."
        },
        {
          icon: "Building2",
          title: "Property & Facility Operations",
          desc: "Commercial & residential listings, tenant lease agreements, and trust accounting."
        }
      ]
    };
  }

  if (ind.includes('real_estate') || ind.includes('realestate') || ind.includes('property')) {
    return {
      badge: "Real Estate Management Suite",
      title: `Powered by ${companyName}`,
      subtitle: "Comprehensive property portfolio management, client CRM, and trust accounting.",
      features: [
        {
          icon: "Building2",
          title: "Property & Listing Portfolio",
          desc: "Full portfolio tracking, listing status, property specs, media galleries, and virtual tours."
        },
        {
          icon: "Users",
          title: "Client & Lead CRM",
          desc: "Buyer & tenant management, scheduled viewings, offer pipelines, and client communications."
        },
        {
          icon: "FileText",
          title: "Leases & Trust Accounting",
          desc: "Digital lease agreements, security deposit management, automated rent billing, and accounting logs."
        },
        {
          icon: "BarChart3",
          title: "Real Estate Analytics",
          desc: "Sales volume metrics, commission tracking, market trends, and performance reports."
        }
      ]
    };
  }

  if (ind.includes('law') || ind.includes('legal')) {
    return {
      badge: "Legal Practice Management",
      title: `Powered by ${companyName}`,
      subtitle: "All-in-one legal case management, conflict check, document automation, and billing.",
      features: [
        {
          icon: "Scale",
          title: "Case & Matter Management",
          desc: "Centralized legal case files, court schedules, deadline tracking, and client matter logs."
        },
        {
          icon: "ShieldCheck",
          title: "Conflict Checking & Discovery",
          desc: "Automated conflict check engine, evidence discovery index, and audit trails."
        },
        {
          icon: "Clock",
          title: "Timekeeping & Invoicing",
          desc: "Precise billable hours tracking, LEDES billing, trust account management, and automated invoices."
        },
        {
          icon: "FolderOpen",
          title: "Document Vault & E-Sign",
          desc: "Contract templates, secure client document vaults, version control, and e-signatures."
        }
      ]
    };
  }

  if (ind.includes('school') || ind.includes('education') || ind.includes('university')) {
    return {
      badge: "Institution Management Suite",
      title: `Powered by ${companyName}`,
      subtitle: "Complete campus administration, student information system, and parent portal.",
      features: [
        {
          icon: "GraduationCap",
          title: "Student Information System",
          desc: "Comprehensive student profiles, enrollment management, attendance, and gradebooks."
        },
        {
          icon: "Calendar",
          title: "Timetable & Class Schedules",
          desc: "Automated timetable generator, teacher schedules, exam dates, and room allocations."
        },
        {
          icon: "Award",
          title: "Exams & Report Cards",
          desc: "Continuous assessment, automated GPA calculation, report cards, and transcripts."
        },
        {
          icon: "Users2",
          title: "Parent & Student Portal",
          desc: "Direct communication, fee collection, announcements, and mobile app access."
        }
      ]
    };
  }

  if (ind.includes('hospital') || ind.includes('health') || ind.includes('clinic')) {
    return {
      badge: "Healthcare & Clinical Suite",
      title: `Powered by ${companyName}`,
      subtitle: "Electronic Health Records, inpatient ward management, pharmacy, and billing.",
      features: [
        {
          icon: "Stethoscope",
          title: "Electronic Health Records (EHR)",
          desc: "Secure patient medical histories, clinical notes, treatment plans, and diagnostic logs."
        },
        {
          icon: "Bed",
          title: "Appointments & Wards",
          desc: "Outpatient scheduling, doctor timetables, ward bed allocation, and admission tracking."
        },
        {
          icon: "Pill",
          title: "Pharmacy & Lab Fulfillment",
          desc: "Digital e-prescriptions, pharmacy inventory, lab sample tracking, and automated results."
        },
        {
          icon: "Receipt",
          title: "Insurance & Claims Billing",
          desc: "Automated medical billing, insurance claim submissions, payment processing, and receipts."
        }
      ]
    };
  }

  if (ind.includes('hotel') || ind.includes('hospitality')) {
    return {
      badge: "Hospitality Management System",
      title: `Powered by ${companyName}`,
      subtitle: "Streamlined reservations, room inventory, housekeeping, and guest experience.",
      features: [
        {
          icon: "Building2",
          title: "Reservation Engine",
          desc: "Real-time booking engine, channel management, check-in/check-out processing."
        },
        {
          icon: "BedDouble",
          title: "Room & Housekeeping Control",
          desc: "Live room cleaning status, housekeeping assignments, and maintenance ticketing."
        },
        {
          icon: "BellRing",
          title: "Guest Concierge & Folios",
          desc: "In-room service requests, guest billing folios, amenity booking, and feedback."
        },
        {
          icon: "TrendingUp",
          title: "Revenue & ADR Analytics",
          desc: "Occupancy rate tracking, Average Daily Rate metrics, and revenue optimization."
        }
      ]
    };
  }

  if (ind.includes('retail') || ind.includes('commerce') || ind.includes('store')) {
    return {
      badge: "Retail & Commerce Suite",
      title: `Powered by ${companyName}`,
      subtitle: "Point of Sale, inventory tracking, order fulfillment, and sales intelligence.",
      features: [
        {
          icon: "ShoppingCart",
          title: "Point of Sale & Checkout",
          desc: "Fast barcode checkout, multi-terminal POS, digital receipts, and payment terminals."
        },
        {
          icon: "Package",
          title: "Inventory & Stock Control",
          desc: "Real-time stock level tracking, low-stock alerts, and multi-store transfers."
        },
        {
          icon: "Truck",
          title: "Order Fulfillment & Logistics",
          desc: "Order processing, delivery dispatching, supplier purchase orders, and tracking."
        },
        {
          icon: "Tag",
          title: "Promotional Rewards & Sales",
          desc: "Customer loyalty points, discount rules, sales analytics, and revenue trends."
        }
      ]
    };
  }

  return {
    badge: "Enterprise Workspace Suite",
    title: `Powered by ${companyName}`,
    subtitle: `The unified digital workspace tailored for ${companyName}.`,
    features: [
      {
        icon: "Zap",
        title: "Operations & Workflow",
        desc: "Streamlined daily workflows, task automation, and team project management."
      },
      {
        icon: "Users",
        title: "Team Collaboration",
        desc: "Integrated communications, document sharing, and cross-departmental alignment."
      },
      {
        icon: "ShieldCheck",
        title: "Enterprise Security",
        desc: "Granular role-based permissions, data encryption, and complete compliance logs."
      },
      {
        icon: "BarChart2",
        title: "Analytics & Intelligence",
        desc: "Live performance dashboards, real-time metrics, and actionable operational insights."
      }
    ]
  };
}
