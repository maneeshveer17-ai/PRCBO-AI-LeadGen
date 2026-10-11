// Realistic mock lead data representing high-value Indian businesses across Tamil Nadu, Karnataka & Telangana
export const mockLeads = [
  {
    id: "lead-101",
    businessName: "Meenakshi Heritage Textiles",
    category: "Manufacturing",
    location: "Madurai, Tamil Nadu",
    contactPerson: "Sundarrajan Alagarsamy",
    designation: "Managing Director",
    email: "contact@meenakshitex.in",
    phone: "+91 94431 82341",
    website: "http://meenakshitex-old.in",
    socialMedia: {
      linkedin: "linkedin.com/company/meenakshi-heritage-textiles",
      instagram: "@meenakshi_fabrics"
    },
    source: "Google Maps Discovery",
    dateAdded: "2026-09-28",
    status: "New",
    aiScore: 94,
    scoreTier: "HOT",
    confidence: "96%",
    qualificationLevel: "Enterprise Ready",
    recommendedService: "IoT Solutions",
    secondaryService: "Web Development",
    rating: 4.6,
    reviewCount: 142,
    address: "14/B Melakkal Main Road, Kochadai, Madurai - 625016",
    summary: "Prominent heritage loom manufacturer producing export-grade organic cotton. Facing machine downtime and inventory tracking blindspots across 3 weaving units.",
    aiAnalysis: {
      businessType: "Industrial B2B Textile Manufacturing",
      websiteOpportunity: {
        level: "HIGH",
        note: "Non-responsive legacy HTTP site with slow load times (>5s) and lack of international catalog showcase."
      },
      digitalMarketingOpportunity: {
        level: "MEDIUM",
        note: "Untapped global B2B procurement queries on Google Ads and LinkedIn targeted at overseas apparel brands."
      },
      uiUxOpportunity: {
        level: "MEDIUM",
        note: "Wholesale ordering portal is cumbersome for bulk international buyers."
      },
      aiOpportunity: {
        level: "HIGH",
        note: "Predictive yarn breakage detection and automated yarn grade quality inspection using computer vision."
      },
      iotOpportunity: {
        level: "CRITICAL",
        note: "Machine RPM, power consumption, and thermal telemetry across 80 looms to prevent unplanned halts."
      }
    },
    whyThisLeadMatters: "High manufacturing turnover (>₹25 Cr ARR) with active budget allocated to industrial modernization and IoT monitoring sensors.",
    businessOpportunity: "Immediate deployment of PRCBO IoT Gateway sensors for loom tracking coupled with an automated cloud analytics dashboard.",
    nextBestAction: "Schedule an on-site demonstration of PRCBO's Smart Factory Telemetry Kit with MD Sundarrajan.",
    outreachDrafts: {
      email: {
        subject: "Modernizing Loom Efficiency & Energy Monitoring for Meenakshi Textiles",
        body: `Dear Mr. Sundarrajan,\n\nI came across Meenakshi Heritage Textiles' impressive heritage weaving footprint in Madurai. While analyzing local textile manufacturers, our team at PRCBO Tech noticed an opportunity to enhance production uptime.\n\nOur industrial IoT telemetry kits help regional spinning and weaving mills reduce unplanned loom halts by up to 28% and track power anomalies per shift in real time.\n\nWould you be open to a 15-minute briefing or a brief on-site demo next Tuesday to see how our IoT dashboards work with existing machinery?\n\nWarm regards,\nPRCBO Tech Enterprise Team\nMadurai, Tamil Nadu`
      },
      whatsapp: {
        message: `Hello Mr. Sundarrajan! 👋 Greetings from PRCBO Tech, Madurai. We help heritage manufacturers optimize loom uptime and energy consumption using smart IoT sensors. Would you like to review a quick 2-page case study on loom telemetry for Madurai textile units?`
      },
      initialMessage: `Hi Sundarrajan, noticed Meenakshi Textiles' export expansion. We build custom factory IoT & production dashboards for Tamil Nadu industrial units. Let's connect!`
    }
  },
  {
    id: "lead-102",
    businessName: "Aura Multispeciality Clinic",
    category: "Healthcare",
    location: "Chennai, Tamil Nadu",
    contactPerson: "Dr. K. Radhakrishnan",
    designation: "Chief Medical Director",
    email: "info@auraclinicchennai.com",
    phone: "+91 98402 11984",
    website: "https://auraclinicchennai.com",
    socialMedia: {
      linkedin: "linkedin.com/company/aura-multispeciality",
      instagram: "@auraclinic_chennai"
    },
    source: "Healthcare Portal Import",
    dateAdded: "2026-09-30",
    status: "Contacted",
    aiScore: 89,
    scoreTier: "HOT",
    confidence: "92%",
    qualificationLevel: "High Priority",
    recommendedService: "Web Development",
    secondaryService: "UI/UX Design",
    rating: 4.8,
    reviewCount: 310,
    address: "88 Anna Salai, Guindy, Chennai - 600032",
    summary: "Fast-growing outpatient clinical chain across 3 locations in Chennai. Digital booking experience is fragmented with frequent appointment drop-offs.",
    aiAnalysis: {
      businessType: "Multi-branch Healthcare & Diagnostics",
      websiteOpportunity: {
        level: "CRITICAL",
        note: "Current booking system redirects to an unbranded 3rd-party widget with high abandonment rates."
      },
      digitalMarketingOpportunity: {
        level: "HIGH",
        note: "High local search intent for 'Specialist clinic in Guindy' currently dominated by aggregators like Practo."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Requires patient-centric appointment portal, doctor schedule sync, and WhatsApp confirmation integrations."
      },
      aiOpportunity: {
        level: "MEDIUM",
        note: "AI triage chatbot for preliminary symptom routing and clinic department matching."
      },
      iotOpportunity: {
        level: "LOW",
        note: "Minor scope for temperature monitoring in reagent storage fridges."
      }
    },
    whyThisLeadMatters: "Direct patient booking yields 40% higher margins over aggregators. Clinic director is actively evaluating custom patient management software.",
    businessOpportunity: "Full-stack patient portal with automated SMS/WhatsApp alerts, doctor calendar management, and SEO-optimized localized landing pages.",
    nextBestAction: "Follow up on the sent demo video of PRCBO's Medical Booking Engine.",
    outreachDrafts: {
      email: {
        subject: "Streamlining Direct Patient Bookings for Aura Multispeciality",
        body: `Dear Dr. Radhakrishnan,\n\nWe recently reviewed Aura Multispeciality Clinic's digital presence in Guindy and noticed your stellar patient feedback (4.8 stars across 300+ reviews!).\n\nHowever, your booking journey currently relies on third-party redirection, where up to 35% of prospective patients drop off before confirmation.\n\nAt PRCBO Tech, we engineer custom healthcare booking platforms that integrate directly with your WhatsApp business number and calendar, eliminating aggregator commissions.\n\nCould we share a 3-minute interactive prototype tailored for Aura Clinic?\n\nBest regards,\nPRCBO Tech Healthcare Solutions`
      },
      whatsapp: {
        message: `Hello Dr. Radhakrishnan! We built a fast, zero-commission patient booking flow designed specifically for multi-branch clinics in Chennai. Could we send you a quick preview link?`
      },
      initialMessage: `Dr. Radhakrishnan, love your patient reviews in Guindy! We help clinics capture direct bookings without giving away commissions to portals. Open to a quick chat?`
    }
  },
  {
    id: "lead-103",
    businessName: "Kovai Precision Forge Works",
    category: "Manufacturing",
    location: "Coimbatore, Tamil Nadu",
    contactPerson: "G. Muruganandham",
    designation: "Head of Operations",
    email: "operations@kovaiforge.com",
    phone: "+91 97899 44320",
    website: "https://kovaiforge.com",
    socialMedia: {
      linkedin: "linkedin.com/company/kovai-precision-forge"
    },
    source: "Google Maps Discovery",
    dateAdded: "2026-10-01",
    status: "Follow-up",
    aiScore: 82,
    scoreTier: "HIGH",
    confidence: "91%",
    qualificationLevel: "Qualified Lead",
    recommendedService: "AI Development",
    secondaryService: "IoT Solutions",
    rating: 4.4,
    reviewCount: 68,
    address: "Plot 42, SIDCO Industrial Estate, Kurichi, Coimbatore - 641021",
    summary: "Precision CNC and forging supplier for tier-1 automotive assemblers. High manual quality inspection costs and scrap rates on complex gears.",
    aiAnalysis: {
      businessType: "Precision Automotive Engineering",
      websiteOpportunity: {
        level: "MEDIUM",
        note: "Decent informational site, but lacks an interactive technical RFQ (Request for Quote) configurator."
      },
      digitalMarketingOpportunity: {
        level: "LOW",
        note: "Niche industrial segment driven primarily by direct B2B relationships and expos."
      },
      uiUxOpportunity: {
        level: "MEDIUM",
        note: "Internal dispatch and scrap logging spreadsheets have high human entry errors."
      },
      aiOpportunity: {
        level: "HIGH",
        note: "Computer-vision surface defect inspection system to spot micro-fissures before dispatch."
      },
      iotOpportunity: {
        level: "HIGH",
        note: "Die press cycle counter and predictive maintenance triggers for hydraulic pumps."
      }
    },
    whyThisLeadMatters: "Automotive supplier under pressure from OEM clients to achieve near-zero-defect Six Sigma certifications.",
    businessOpportunity: "Custom AI Computer Vision Quality Inspection rig that reduces optical inspection time from 90 seconds to under 2 seconds per gear.",
    nextBestAction: "Provide technical ROI calculation showing scrap reduction savings.",
    outreachDrafts: {
      email: {
        subject: "Automated Vision Defect Inspection for Kovai Precision Forge",
        body: `Hello Mr. Muruganandham,\n\nMaintaining Six Sigma standards across forged automotive components is demanding when relying on manual optical checks.\n\nPRCBO Tech specializes in computer-vision AI systems that detect surface cracks, burrs, and dimensional variations in under 2 seconds directly on conveyor lines.\n\nWe would love to run a test benchmark on sample components from your Kurichi facility.\n\nBest regards,\nAI Solutions Team, PRCBO Tech`
      },
      whatsapp: {
        message: `Hello Mr. Muruganandham! We have an edge-AI vision system benchmarked for Coimbatore auto-component forgings that flags micro-defects at line speed. When would be a good time to discuss?`
      },
      initialMessage: `Hi Muruganandham, let's explore automating surface crack detection on your CNC lines with PRCBO Vision AI.`
    }
  },
  {
    id: "lead-104",
    businessName: "Chola Grand Banquet & Suites",
    category: "Hotel",
    location: "Trichy, Tamil Nadu",
    contactPerson: "Mrs. Revathi Senthil",
    designation: "General Manager",
    email: "gm@cholagrandtrichy.com",
    phone: "+91 94426 77102",
    website: "http://cholagrand.in",
    socialMedia: {
      instagram: "@cholagrand_trichy",
      facebook: "facebook.com/cholagrandtrichy"
    },
    source: "Direct Ingestion",
    dateAdded: "2026-10-02",
    status: "New",
    aiScore: 91,
    scoreTier: "HOT",
    confidence: "94%",
    qualificationLevel: "High Priority",
    recommendedService: "Digital Marketing",
    secondaryService: "Web Development",
    rating: 4.5,
    reviewCount: 420,
    address: "22 Collector Office Road, Cantonment, Tiruchirappalli - 620001",
    summary: "Premium 4-star boutique hotel and banquet destination in Trichy. Struggles with wedding hall off-season bookings and relies heavily on OTA commissions (MakeMyTrip/Booking.com).",
    aiAnalysis: {
      businessType: "Hospitality & Event Spaces",
      websiteOpportunity: {
        level: "HIGH",
        note: "360-degree virtual tour missing; lacks an intuitive banquet enquiry and availability calendar."
      },
      digitalMarketingOpportunity: {
        level: "CRITICAL",
        note: "No structured Google Meta-Search ads or Instagram bridal campaigns targeting wedding planners in Central TN."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Mobile booking experience feels outdated compared to standard hospitality benchmarks."
      },
      aiOpportunity: {
        level: "MEDIUM",
        note: "Dynamic seasonal room pricing engine based on local temple festival dates and train arrivals."
      },
      iotOpportunity: {
        level: "LOW",
        note: "Smart room keycards and HVAC energy savers for banquet halls."
      }
    },
    whyThisLeadMatters: "High average order value on weddings (₹3L - ₹10L per event) with immediate appetite for high-ROI digital lead acquisition.",
    businessOpportunity: "Comprehensive digital growth package: luxury responsive portal with 3D banquet showcases + targeted Meta & Google Ads funnel.",
    nextBestAction: "Call Mrs. Revathi Senthil to offer an audit of their OTA commission leakages.",
    outreachDrafts: {
      email: {
        subject: "Driving Direct Wedding & Banquet Enquiries for Chola Grand",
        body: `Dear Mrs. Revathi,\n\nCongratulations on Chola Grand's reputation as one of Trichy Cantonment's top luxury destinations.\n\nWe reviewed the online booking funnel for your banquet halls and noticed that prospective brides and corporate event organizers are often lost to aggregators charging 15-20% commissions.\n\nAt PRCBO Tech, we build high-converting banquet booking funnels with 3D virtual walkthroughs and targeted regional ad campaigns that drive direct inquiries straight to your sales desk.\n\nWould you have 10 minutes this week for a walkthrough of our hospitality conversion framework?\n\nWarm regards,\nPRCBO Tech Digital Growth Team`
      },
      whatsapp: {
        message: `Hello Mrs. Revathi! Chola Grand's banquets are stunning. We help premium hotels in Tamil Nadu capture direct wedding bookings without heavy OTA commissions. Would you like our Trichy hospitality case study?`
      },
      initialMessage: `Mrs. Revathi, we can help Chola Grand increase direct banquet inquiries by 40% with a specialized virtual tour & ad funnel.`
    }
  },
  {
    id: "lead-105",
    businessName: "Namma Bengaluru Cloud Kitchens",
    category: "Restaurant",
    location: "Bengaluru, Karnataka",
    contactPerson: "Arjun Nambiar",
    designation: "Co-Founder & CEO",
    email: "arjun@nammakitchens.blr",
    phone: "+91 99001 54321",
    website: "https://nammabengalurukitchens.com",
    socialMedia: {
      instagram: "@nammabengalurubites",
      linkedin: "linkedin.com/company/namma-kitchens"
    },
    source: "Startup Database Crawl",
    dateAdded: "2026-10-02",
    status: "Contacted",
    aiScore: 76,
    scoreTier: "HIGH",
    confidence: "88%",
    qualificationLevel: "Qualified Lead",
    recommendedService: "UI/UX Design",
    secondaryService: "Web Development",
    rating: 4.2,
    reviewCount: 890,
    address: "5th Block, Koramangala, Bengaluru - 560095",
    summary: "Multi-brand cloud kitchen network operating 8 virtual delivery brands across Koramangala, Indiranagar, and HSR Layout. Deep dependency on Swiggy/Zomato 30% take rates.",
    aiAnalysis: {
      businessType: "Multi-Brand FoodTech & Cloud Kitchens",
      websiteOpportunity: {
        level: "HIGH",
        note: "Currently lacks a unified direct-to-consumer order site with loyalty points."
      },
      digitalMarketingOpportunity: {
        level: "HIGH",
        note: "Hyper-local geo-fenced Instagram reels advertising special lunch combos within a 4km radius."
      },
      uiUxOpportunity: {
        level: "CRITICAL",
        note: "Requires a frictionless 60-second mobile ordering web application with 1-click UPI checkout."
      },
      aiOpportunity: {
        level: "MEDIUM",
        note: "Predictive demand forecasting for perishable raw ingredients (chicken, paneer, veggies) based on rainy weather."
      },
      iotOpportunity: {
        level: "MEDIUM",
        note: "Deep fryer oil quality sensors and freezer temperature logging."
      }
    },
    whyThisLeadMatters: "High order volume (>1,200 orders/day). Capturing even 15% via direct D2C orders saves over ₹2.5L monthly in commission.",
    businessOpportunity: "PWA (Progressive Web App) for direct ordering with UPI zero-fee payments, integrated with Dunzo/Shadowfax delivery APIs.",
    nextBestAction: "Demo the mobile D2C ordering app prototype designed for fast checkout.",
    outreachDrafts: {
      email: {
        subject: "Slashing Food Delivery Commission for Namma Bengaluru Kitchens",
        body: `Hi Arjun,\n\nRunning 8 delivery brands across Koramangala and HSR is no easy feat—especially with Swiggy and Zomato slicing away 28-32% on every bill.\n\nWe built a rapid mobile ordering experience with instant WhatsApp ordering and 1-tap UPI payments that allows cloud kitchens to build direct customer loyalty and keep 100% of the ticket size.\n\nLet's do a 10-minute coffee chat or call this Thursday.\n\nCheers,\nPRCBO Tech FoodTech Group`
      },
      whatsapp: {
        message: `Hey Arjun! 🍔 Saw your rapid scale in Koramangala. Are you guys exploring direct WhatsApp & UPI ordering to cut aggregator commissions? We have a live demo ready.`
      },
      initialMessage: `Arjun, let's stop paying 30% to food aggregators. Check out our 1-click UPI ordering PWA built for BLR cloud kitchens.`
    }
  },
  {
    id: "lead-106",
    businessName: "Deccan BioTech Agro Sciences",
    category: "Startup",
    location: "Hyderabad, Telangana",
    contactPerson: "Dr. Sandeep Varma",
    designation: "Founder & Chief Scientist",
    email: "sandeep.varma@deccanbio.tech",
    phone: "+91 91770 88219",
    website: "https://deccanbio.tech",
    socialMedia: {
      linkedin: "linkedin.com/company/deccan-biotech",
      twitter: "@DeccanAgroTech"
    },
    source: "T-Hub Ecosystem Directory",
    dateAdded: "2026-10-03",
    status: "New",
    aiScore: 96,
    scoreTier: "HOT",
    confidence: "97%",
    qualificationLevel: "Enterprise Ready",
    recommendedService: "AI Development",
    secondaryService: "IoT Solutions",
    rating: 4.9,
    reviewCount: 34,
    address: "T-Hub Phase 2, Madhapur, Hyderabad - 500081",
    summary: "Seed-funded AgriTech startup developing microbial soil health enhancers and bio-fertilizers. Needs a farmer-facing mobile AI diagnostic tool to detect crop soil deficiencies from leaf photos.",
    aiAnalysis: {
      businessType: "AgriTech & Bio-Formulations",
      websiteOpportunity: {
        level: "MEDIUM",
        note: "Needs a clinical B2B investor and distributor dashboard with field trial efficacy charts."
      },
      digitalMarketingOpportunity: {
        level: "MEDIUM",
        note: "YouTube educational content for progressive farmers and FPO (Farmer Producer Org) leaders."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Multilingual farmer application (Telugu, Tamil, Kannada, Hindi) that works on low-cost Android phones."
      },
      aiOpportunity: {
        level: "CRITICAL",
        note: "Offline-capable lightweight edge computer vision model to diagnose plant nutrient deficiency from camera photos."
      },
      iotOpportunity: {
        level: "HIGH",
        note: "LoRaWAN soil moisture, NPK, and electrical conductivity probes for precision test plots."
      }
    },
    whyThisLeadMatters: "Recently secured ₹3.5 Cr seed grant with explicit line items for AI model development and farmer telemetry deployment.",
    businessOpportunity: "Core engineering partnership to build their computer vision leaf diagnostic model and multilingual React Native / Web portal.",
    nextBestAction: "Send technical proposal outlining offline mobile vision inference latency and accuracy metrics.",
    outreachDrafts: {
      email: {
        subject: "Edge AI Soil & Crop Diagnostics Partnership for Deccan BioTech",
        body: `Dear Dr. Sandeep,\n\nWe have been following Deccan BioTech's innovative microbial trials at T-Hub with great enthusiasm.\n\nEmpowering smallholder farmers to diagnose soil and leaf deficiencies in real-time requires ultra-fast, offline-capable computer vision models that run smoothly on budget smartphones even with 2G connectivity.\n\nAt PRCBO Tech, our AI engineering unit builds optimized TensorFlow Lite / ONNX vision pipelines specifically trained for regional agriculture.\n\nWould you be open to reviewing a technical benchmark next Monday?\n\nSincerely,\nAI Lead, PRCBO Tech`
      },
      whatsapp: {
        message: `Hello Dr. Sandeep! Congratulations on your T-Hub showcase. We specialize in building offline edge-AI crop disease & nutrient detection apps for AgriTechs. Would love to connect!`
      },
      initialMessage: `Dr. Sandeep, exciting work at Deccan Bio! We can help build your offline mobile AI crop diagnosis model. Let's talk.`
    }
  },
  {
    id: "lead-107",
    businessName: "Vaigai Smart Logistics & Warehousing",
    category: "Manufacturing",
    location: "Madurai, Tamil Nadu",
    contactPerson: "K. Manikandan",
    designation: "VP Logistics",
    email: "mani@vaigailogistics.com",
    phone: "+91 98421 66550",
    website: "http://vaigailogistics.in",
    socialMedia: {
      linkedin: "linkedin.com/company/vaigai-smart-logistics"
    },
    source: "Google Maps Discovery",
    dateAdded: "2026-10-01",
    status: "Follow-up",
    aiScore: 84,
    scoreTier: "HIGH",
    confidence: "90%",
    qualificationLevel: "High Priority",
    recommendedService: "IoT Solutions",
    secondaryService: "Web Development",
    rating: 4.3,
    reviewCount: 52,
    address: "Kappalur Industrial Estate, Madurai - 625008",
    summary: "Cold storage and 3PL distribution hub handling perishable agricultural produce and dairy across southern Tamil Nadu.",
    aiAnalysis: {
      businessType: "3PL & Cold Chain Logistics",
      websiteOpportunity: {
        level: "MEDIUM",
        note: "Client portal needed for real-time pallet availability and consignment status tracking."
      },
      digitalMarketingOpportunity: {
        level: "LOW",
        note: "Enterprise B2B relationships with regional food processors."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Warehouse manager tablet interface for pallet scanning and temperature alerting."
      },
      aiOpportunity: {
        level: "MEDIUM",
        note: "Fleet route optimization to minimize fuel burn across rural delivery loops."
      },
      iotOpportunity: {
        level: "CRITICAL",
        note: "Continuous BLE temperature and humidity dataloggers for cold rooms to prevent spoilage claims."
      }
    },
    whyThisLeadMatters: "Spends significant sums on spoilage disputes. Regulatory compliance requires continuous temperature audit logs.",
    businessOpportunity: "PRCBO Wireless Temperature Telemetry kit for 12 cold rooms + automated alert dispatch over SMS/WhatsApp.",
    nextBestAction: "Prepare quote for pilot sensor installation across 2 cold storage chambers.",
    outreachDrafts: {
      email: {
        subject: "Eliminating Cold Room Spoilage Disputes for Vaigai Logistics",
        body: `Dear Mr. Manikandan,\n\nManaging cold-chain integrity across Kappalur's perishable shipments requires continuous, tamper-proof temperature logging.\n\nPRCBO Tech provides industrial wireless thermal sensors that transmit live logs to the cloud every 60 seconds and trigger immediate alerts if temperatures deviate by even 1.5°C.\n\nCould we arrange a brief 10-minute demonstration at your Kappalur office?\n\nWarm regards,\nPRCBO Tech Industrial IoT Division`
      },
      whatsapp: {
        message: `Hello Mr. Manikandan! We help cold storage facilities in Madurai prevent produce spoilage with 24/7 wireless temperature sensors and instant phone alerts. Can we share a quick flyer?`
      },
      initialMessage: `Hi Manikandan, eliminate cold-room spoilage risk with PRCBO's wireless thermal sensor gateway.`
    }
  },
  {
    id: "lead-108",
    businessName: "Apex Global Edutech",
    category: "Education",
    location: "Chennai, Tamil Nadu",
    contactPerson: "Preethi Chandran",
    designation: "Head of Admissions & Marketing",
    email: "preethi@apexglobaledu.com",
    phone: "+91 94441 33221",
    website: "https://apexglobaledu.com",
    socialMedia: {
      instagram: "@apex_edutech",
      linkedin: "linkedin.com/company/apex-global-edutech"
    },
    source: "Education Fair Directory",
    dateAdded: "2026-09-29",
    status: "Converted",
    aiScore: 92,
    scoreTier: "HOT",
    confidence: "95%",
    qualificationLevel: "Converted Client",
    recommendedService: "Web Development",
    secondaryService: "Digital Marketing",
    rating: 4.7,
    reviewCount: 280,
    address: "Velachery Main Road, Chennai - 600042",
    summary: "Study abroad and professional test prep institute training over 1,500 students annually for GRE, IELTS, and German language certifications.",
    aiAnalysis: {
      businessType: "Higher Education & Test Preparation",
      websiteOpportunity: {
        level: "CRITICAL",
        note: "Required an interactive course eligibility calculator and mock exam testing engine."
      },
      digitalMarketingOpportunity: {
        level: "HIGH",
        note: "Targeted student enrollment ads on Instagram & Google Search during college graduation season."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Student portal with automated homework submissions and visa counseling scheduling."
      },
      aiOpportunity: {
        level: "MEDIUM",
        note: "AI IELTS speaking evaluation tool with pronunciation feedback."
      },
      iotOpportunity: {
        level: "LOW",
        note: "Not applicable."
      }
    },
    whyThisLeadMatters: "High lifetime student value (₹45,000 avg course fee). Direct web conversions yield exceptional ROI.",
    businessOpportunity: "Full LMS (Learning Management System) development with online test proctoring, which successfully converted to active contract.",
    nextBestAction: "Deliver phase 2 LMS feature updates and discuss Q4 digital marketing retainer.",
    outreachDrafts: {
      email: {
        subject: "Project Milestone Review - Apex Global LMS",
        body: `Dear Preethi,\n\nFollowing up on our successful Phase 1 rollout of the student admission portal, we've prepared the Q4 analytics breakdown showing a 42% lift in direct test registrations.\n\nLet's connect this Friday to review the Phase 2 roadmap.\n\nBest,\nPRCBO Tech Delivery Team`
      },
      whatsapp: {
        message: `Hi Preethi! Hope the new admissions dashboard is performing well. Sharing the weekly conversion summary for your review.`
      },
      initialMessage: `Client active: Project review scheduled for Friday.`
    }
  },
  {
    id: "lead-109",
    businessName: "Kallazhagar Silks & Sarees",
    category: "Retail",
    location: "Madurai, Tamil Nadu",
    contactPerson: "N. Muthukumar",
    designation: "Proprietor",
    email: "kallazhagar.silks@gmail.com",
    phone: "+91 98430 99881",
    website: "https://kallazhagarsilks.com",
    socialMedia: {
      instagram: "@kallazhagar_silks",
      facebook: "facebook.com/kallazhagarsilks"
    },
    source: "Google Maps Discovery",
    dateAdded: "2026-10-03",
    status: "New",
    aiScore: 78,
    scoreTier: "HIGH",
    confidence: "86%",
    qualificationLevel: "Qualified Lead",
    recommendedService: "Graphic Design",
    secondaryService: "Digital Marketing",
    rating: 4.6,
    reviewCount: 512,
    address: "South Masi Street, Madurai - 625001",
    summary: "Iconic bridal silk saree destination near Meenakshi Temple. Enjoys strong foot traffic but lacks brand polish on festive social media and catalog creatives.",
    aiAnalysis: {
      businessType: "Luxury Bridal & Traditional Retail",
      websiteOpportunity: {
        level: "MEDIUM",
        note: "Catalog showcase exists, but checkout requires manual WhatsApp coordination."
      },
      digitalMarketingOpportunity: {
        level: "HIGH",
        note: "Festive Diwali / Pongal bridal saree video ads and influencer collaborations."
      },
      uiUxOpportunity: {
        level: "MEDIUM",
        note: "Mobile catalog requires smooth saree drape zoom and color variance filters."
      },
      aiOpportunity: {
        level: "LOW",
        note: "Virtual saree try-on is an experimental future opportunity."
      },
      iotOpportunity: {
        level: "LOW",
        note: "In-store customer footfall counters."
      }
    },
    whyThisLeadMatters: "High seasonal sales peaks; store owner wants to elevate the brand to compete with Chennai retailers like Nalli and Palam Silks.",
    businessOpportunity: "Comprehensive festive brand identity overhaul, print catalog design, and premium social media creative templates.",
    nextBestAction: "Showcase PRCBO's design portfolio of luxury retail packaging and lookbook creatives.",
    outreachDrafts: {
      email: {
        subject: "Elevating Kallazhagar Silks' Festive Bridal Campaigns",
        body: `Dear Mr. Muthukumar,\n\nKallazhagar Silks has an unmatched reputation for pure Kanchipuram and Madurai Sungudi weaves on South Masi Street.\n\nWith the upcoming wedding and festival seasons, having high-definition visual campaigns, catalog lookbooks, and cohesive social branding will allow you to attract NRI and outstation bridal shoppers looking for authentic Madurai silks.\n\nPRCBO Tech's design studio creates high-end visual campaigns for Tamil Nadu's leading retailers. We would love to share a complimentary sample creative kit tailored for your brand.\n\nWarm regards,\nDesign Studio, PRCBO Tech`
      },
      whatsapp: {
        message: `Vanakkam Mr. Muthukumar! Kallazhagar Silks is legendary in Madurai. We designed a sample festive social media campaign mock for your bridal collection. May we share the preview PDF?`
      },
      initialMessage: `Vanakkam Muthukumar sir! We'd love to help Kallazhagar Silks stand out this festive season with high-end lookbooks and digital creatives.`
    }
  },
  {
    id: "lead-110",
    businessName: "Zenith Skylines Realty",
    category: "Real Estate",
    location: "Hyderabad, Telangana",
    contactPerson: "Vikramaditya Rao",
    designation: "VP Sales & Marketing",
    email: "v.rao@zenithskylines.com",
    phone: "+91 90001 22334",
    website: "https://zenithskylines.com",
    socialMedia: {
      linkedin: "linkedin.com/company/zenith-skylines",
      instagram: "@zenith_skylines_hyd"
    },
    source: "Real Estate Expo Lead List",
    dateAdded: "2026-10-02",
    status: "Follow-up",
    aiScore: 88,
    scoreTier: "HOT",
    confidence: "93%",
    qualificationLevel: "High Priority",
    recommendedService: "Digital Marketing",
    secondaryService: "UI/UX Design",
    rating: 4.1,
    reviewCount: 88,
    address: "Financial District, Nanakramguda, Hyderabad - 500032",
    summary: "Developing premium 3BHK and 4BHK high-rise gated communities in Kokapet and Financial District. High cost-per-lead on Google Ads with low site engagement.",
    aiAnalysis: {
      businessType: "Luxury Residential Real Estate",
      websiteOpportunity: {
        level: "HIGH",
        note: "Landing pages take 6 seconds to load high-res renders, leading to a 65% bounce rate on mobile ads."
      },
      digitalMarketingOpportunity: {
        level: "CRITICAL",
        note: "High Google Search ad spend (₹4L/mo) hemorrhaging budget on generic keywords without negative match hygiene."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Interactive floor plan selector and EMI calculator are broken on iOS mobile browsers."
      },
      aiOpportunity: {
        level: "MEDIUM",
        note: "AI WhatsApp qualification bot to screen buyer budgets (>₹2.5 Cr) before assigning to human agents."
      },
      iotOpportunity: {
        level: "LOW",
        note: "Smart home automation partner tie-up for model flats."
      }
    },
    whyThisLeadMatters: "Massive digital ad budget with immediate pain around lead quality and mobile landing page drop-offs.",
    businessOpportunity: "Ultra-fast Next.js/React project microsite with 3D floor plan explorer + automated WhatsApp qualification bot.",
    nextBestAction: "Present landing page speed audit comparing Zenith with rival My Home and Prestige project sites.",
    outreachDrafts: {
      email: {
        subject: "Optimizing Kokapet Luxury Project Landing Page Speed & Lead Cost",
        body: `Dear Mr. Vikramaditya,\n\nWe noticed Zenith Skylines is actively advertising premium Kokapet residences across Google and LinkedIn.\n\nOur performance analysis detected that your mobile project page takes over 5.8 seconds to load on 4G connections, causing approximately 60% of prospective buyers to bounce before filling out the site-visit form.\n\nPRCBO Tech crafts lightning-fast, high-conversion real estate web applications that load in under 1.2s and qualify buyer budgets automatically via WhatsApp.\n\nCould we share a 5-point performance audit of your current landing page?\n\nBest regards,\nGrowth Engineering, PRCBO Tech`
      },
      whatsapp: {
        message: `Hello Mr. Vikramaditya! We ran a mobile performance audit on your Zenith Kokapet landing page. Speeding up the floor-plan viewer could lower your cost-per-lead by 30%. Can we share the 1-page report?`
      },
      initialMessage: `Vikramaditya, your Kokapet high-rise project is fantastic. Let's fix the mobile landing page bounce rate and double site-visit bookings.`
    }
  },
  {
    id: "lead-111",
    businessName: "Ananya Organic Naturals",
    category: "E-commerce",
    location: "Coimbatore, Tamil Nadu",
    contactPerson: "Ananya Krishnan",
    designation: "Founder",
    email: "ananya@organicnaturals.store",
    phone: "+91 97900 11223",
    website: "https://ananyaorganicnaturals.in",
    socialMedia: {
      instagram: "@ananya_organics",
      facebook: "facebook.com/ananyaorganics"
    },
    source: "Shopify Store Directory",
    dateAdded: "2026-10-04",
    status: "New",
    aiScore: 68,
    scoreTier: "MEDIUM",
    confidence: "82%",
    qualificationLevel: "Standard Lead",
    recommendedService: "UI/UX Design",
    secondaryService: "Digital Marketing",
    rating: 4.5,
    reviewCount: 190,
    address: "R.S. Puram, Coimbatore - 641002",
    summary: "D2C skincare brand utilizing cold-pressed oils and herbal ingredients from the Western Ghats. High cart abandonment rate on checkout.",
    aiAnalysis: {
      businessType: "D2C Organic Personal Care",
      websiteOpportunity: {
        level: "MEDIUM",
        note: "Store runs on basic Shopify template with default colors and standard checkout."
      },
      digitalMarketingOpportunity: {
        level: "HIGH",
        note: "Meta Advantage+ shopping campaigns focused on cold-pressed coconut and moringa oils."
      },
      uiUxOpportunity: {
        level: "HIGH",
        note: "Skin-type diagnostic quiz that recommends custom product bundles to boost Average Order Value (AOV)."
      },
      aiOpportunity: {
        level: "LOW",
        note: "Basic product recommendation algorithm."
      },
      iotOpportunity: {
        level: "LOW",
        note: "Not applicable."
      }
    },
    whyThisLeadMatters: "Passionate founder with strong organic repeat customer base ready to scale from ₹8L to ₹30L monthly GMV.",
    businessOpportunity: "Interactive Skin Quiz UI/UX flow and subscription reorder system that increases repeat purchase velocity.",
    nextBestAction: "Send mockup of an interactive skin quiz widget.",
    outreachDrafts: {
      email: {
        subject: "Boosting Average Order Value for Ananya Organics with a Skin Quiz",
        body: `Hi Ananya,\n\nLoved the authentic sourcing story behind your Western Ghats cold-pressed skincare line!\n\nWhen analyzing high-growth D2C beauty brands, introducing a personalized 'Find Your Skin Ritual' interactive quiz typically lifts cart size by 25% and reduces checkout drop-off.\n\nWe designed a quick UI prototype showing how this would look on Ananya Organics. Would you like to check it out?\n\nBest,\nPRCBO Tech D2C Studio`
      },
      whatsapp: {
        message: `Hey Ananya! Love your moringa oil line. We created a quick interactive skin quiz concept for your store to help shoppers find the right products faster. Want a sneak peek?`
      },
      initialMessage: `Hi Ananya! We can help increase your D2C store's cart value with an interactive skin ritual quiz.`
    }
  },
  {
    id: "lead-112",
    businessName: "Sri Krishna Metal Castings",
    category: "Manufacturing",
    location: "Madurai, Tamil Nadu",
    contactPerson: "T. Balasubramanian",
    designation: "Plant Manager",
    email: "srikrishnametals@rediffmail.com",
    phone: "+91 94432 10098",
    website: "",
    socialMedia: {},
    source: "Google Maps Discovery",
    dateAdded: "2026-09-25",
    status: "Rejected",
    aiScore: 38,
    scoreTier: "LOW",
    confidence: "74%",
    qualificationLevel: "Low Potential",
    recommendedService: "Web Development",
    secondaryService: "Graphic Design",
    rating: 3.8,
    reviewCount: 14,
    address: "Industrial Estate, Nagari, Madurai - 625402",
    summary: "Traditional iron foundry manufacturing agricultural pump housings. No active digital presence or technology budget.",
    aiAnalysis: {
      businessType: "Cast Iron Foundry",
      websiteOpportunity: {
        level: "MEDIUM",
        note: "Lacks any website; business operates purely on local cash-and-carry and old vendor contracts."
      },
      digitalMarketingOpportunity: {
        level: "LOW",
        note: "No digital search demand in their geographic niche."
      },
      uiUxOpportunity: {
        level: "LOW",
        note: "No software systems in use."
      },
      aiOpportunity: {
        level: "LOW",
        note: "Low automation readiness."
      },
      iotOpportunity: {
        level: "LOW",
        note: "Equipment is uninstrumented legacy cupola furnaces."
      }
    },
    whyThisLeadMatters: "Historically low technology adoption readiness; flagged as rejected to avoid wasted sales bandwidth.",
    businessOpportunity: "Minimal. Potential starter catalog website if owner decides to pursue modern supply chain contracts.",
    nextBestAction: "Archive lead. Revisit in 12 months.",
    outreachDrafts: {
      email: {
        subject: "Introduction to Modern B2B Web Catalogs",
        body: `Dear Sir,\n\nWe provide simple B2B web catalog setups for industrial foundries in Madurai. Let us know if you plan to launch a website this financial year.\n\nRegards,\nPRCBO Tech`
      },
      whatsapp: {
        message: `Hello sir, if Sri Krishna Metals is looking to create a business website or brochure, PRCBO Tech Madurai is at your service.`
      },
      initialMessage: `Archived lead. No immediate action required.`
    }
  }
];

// Helper calculations and filters
export const getLeadsByStatus = (status) => {
  if (!status || status === "All") return mockLeads;
  return mockLeads.filter(l => l.status.toLowerCase() === status.toLowerCase());
};

export const getLeadsByScoreTier = (tier) => {
  if (!tier || tier === "All") return mockLeads;
  return mockLeads.filter(l => l.scoreTier.toLowerCase() === tier.toLowerCase());
};

export const getLeadById = (id) => {
  return mockLeads.find(l => l.id === id) || mockLeads[0];
};

export const getKpiMetrics = () => {
  const total = mockLeads.length;
  const newLeads = mockLeads.filter(l => l.status === "New").length;
  const hotLeads = mockLeads.filter(l => l.scoreTier === "HOT").length;
  const contacted = mockLeads.filter(l => l.status === "Contacted" || l.status === "Follow-up").length;
  const converted = mockLeads.filter(l => l.status === "Converted").length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;

  return {
    totalLeads: { value: "2,486", raw: total, change: "+12.8%", positive: true, comparison: "vs last month" },
    newLeads: { value: "412", raw: newLeads, change: "+8.4%", positive: true, comparison: "vs last week" },
    hotLeads: { value: "189", raw: hotLeads, change: "+24.2%", positive: true, comparison: "high qualification" },
    contacted: { value: "854", raw: contacted, change: "+15.1%", positive: true, comparison: "active outreach" },
    converted: { value: "148", raw: converted, change: "+6.3%", positive: true, comparison: "deals closed" },
    conversionRate: { value: "17.4%", raw: `${conversionRate}%`, change: "+2.1%", positive: true, comparison: "industry avg: 11%" }
  };
};
