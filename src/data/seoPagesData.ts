export interface SeoTopicFaq {
  question: string;
  answer: string;
}

export interface SeoInternalLink {
  title: string;
  path: string;
  description: string;
}

export interface SeoPracticalTip {
  title: string;
  advice: string;
}

export interface SeoTopicPageData {
  slug: string;
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  hindiTitle: string;
  badge: string;
  intro: string;
  keyRule: string;
  disclaimerText: string;
  idealDirections: {
    direction: string;
    hindiName: string;
    verdict: 'Best' | 'Acceptable' | 'Avoid';
    explanation: string;
  }[];
  goldenPrinciples: {
    title: string;
    description: string;
    remedyTip?: string;
  }[];
  commonMistakes: {
    mistake: string;
    impact: string;
    remedy: string;
  }[];
  practicalConsiderations: SeoPracticalTip[];
  faq: SeoTopicFaq[];
  internalLinks: SeoInternalLink[];
  ctaText: string;
  ctaQuery: string;
}

const TOPIC_DISCLAIMER =
  'Advisory Notice: Vastu suggestions on this page represent traditional Indian cultural beliefs and historical architectural conventions. They are not empirical scientific laws, medical cures, or financial guarantees. Always prioritize structural safety, building bylaws, and personal comfort.';

export const SEO_TOPIC_PAGES: Record<string, SeoTopicPageData> = {
  'vastu-shastra': {
    slug: 'vastu-shastra',
    path: '/vastu-shastra',
    title: 'Vastu Shastra Guide – Ancient Vedic Architecture for Modern Homes',
    metaDescription: 'Explore the foundations of Vastu Shastra for modern living. Learn how Panchabhutas (five elements), solar movement, and magnetic fields shape home harmony.',
    h1: 'Vastu Shastra: Principles, Directions & Modern Application',
    subtitle: 'Vedic spatial science aligned with daylight, ventilation, and thermal harmony',
    hindiTitle: 'वास्तु शास्त्र: आधुनिक घरों के लिए संपूर्ण मार्गदर्शिका',
    badge: 'Core Fundamentals',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'Vastu Shastra (वास्तु शास्त्र) is the timeless Indian science of architecture and spatial design. Originating from classical texts like the Mayamata, Manasara, and Brihat Samhita, Vastu balances the five primordial elements—Earth (Prithvi), Water (Jal), Fire (Agni), Air (Vayu), and Space (Akash)—with natural solar progression and wind patterns. In modern apartments and independent houses, practical Vastu creates peaceful, healthy, and organized living spaces without superstitious fear or unnecessary structural demolition.',
    keyRule: 'Balance the 5 natural elements across cardinal zones: Water in North-East, Fire in South-East, Earth in South-West, Air in North-West, and Space at the center (Brahmasthan).',
    idealDirections: [
      {
        direction: 'North-East (Ishan)',
        hindiName: 'ईशान कोण',
        verdict: 'Best',
        explanation: 'Associated with Water and mental clarity in traditional Vastu. Receives gentle morning ultraviolet light. Keep light, clean, and uncluttered.',
      },
      {
        direction: 'South-East (Agni)',
        hindiName: 'आग्नेय कोण',
        verdict: 'Best',
        explanation: 'Fire energy and thermal warmth. Best suited for the kitchen and cooking stove to harness midday warmth.',
      },
      {
        direction: 'South-West (Nairutya)',
        hindiName: 'नैऋत्य कोण',
        verdict: 'Best',
        explanation: 'Earth element and physical stability. Best for master bedrooms and solid load-bearing furniture.',
      },
      {
        direction: 'North-West (Vayavya)',
        hindiName: 'वायव्य कोण',
        verdict: 'Acceptable',
        explanation: 'Air and movement. Ideal for guest rooms, pantry storage, and cross-ventilation.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Brahmasthan Openness',
        description: 'The geometric center of the home (Brahmasthan) represents pure space (Akash). Keeping this zone uncluttered allows free airflow, natural daylight diffusion, and comfortable movement throughout all adjoining rooms.',
        remedyTip: 'Avoid heavy pillars, toilets, or dark storage closets directly in the center of the house.',
      },
      {
        title: 'Circadian Solar Rhythm',
        description: 'Vastu aligns room usage with solar progression: wake up with morning light in the East/North-East, cook with high energy in the South-East, rest in the cool South-West.',
        remedyTip: 'Maximize large windows on North and East facades; minimize heat gain on West and South facades.',
      },
      {
        title: 'Non-Destructive Remedies (Dosh Nivaran)',
        description: 'Classical Vastu favors harmony and practical adjustments over demolition. Shifting furniture, utilizing mirrors to reflect light, adjusting curtain colors, and incorporating indoor plants harmonize elements effectively.',
        remedyTip: 'Use brass elements for West, wood/plants for East, and earthen pots for South-West.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Placing toilets in North-East (Ishan Kon)',
        impact: 'According to traditional beliefs, this disrupts the quiet water zone. Practically, it may introduce moisture to morning-light zones.',
        remedy: 'Keep toilet lid closed, ensure active exhaust ventilation, and place a small bowl of unrefined sea salt to absorb dampness.',
      },
      {
        mistake: 'Heavy storage in North or East zones',
        impact: 'Blocks morning solar energy and gentle atmospheric airflow into interior spaces.',
        remedy: 'Move heavy wardrobes, steel almirahs, and storage boxes to South or West walls.',
      },
      {
        mistake: 'Believing that demolition is mandatory for Vastu balance',
        impact: 'Unnecessary anxiety, high expense, and structural damage to the home.',
        remedy: 'Consult Ghar Ghar Vastu for gentle non-structural remedies such as lighting, color correction, and directional realignment.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Passive Solar Daylighting',
        advice: 'Position study desks and family seating near East and North windows to benefit from natural daylighting, which reduces eye strain and artificial lighting costs.',
      },
      {
        title: 'Natural Cross-Drafts',
        advice: 'Ensure windows on opposing walls can be opened simultaneously for 15–20 minutes each morning to flush stale indoor CO2.',
      },
      {
        title: 'Structural Safety First',
        advice: 'Never alter load-bearing columns, shear walls, or floor slabs based on layout suggestions without certified structural engineering drawings.',
      },
    ],
    faq: [
      {
        question: 'What is the main purpose of Vastu Shastra?',
        answer: 'The primary purpose of Vastu Shastra is to align human dwellings with natural forces (sunlight, wind directions, and spatial proportions) to foster physical comfort, mental calm, and family harmony.',
      },
      {
        question: 'Can Vastu defects (dosh) be corrected without breaking walls?',
        answer: 'Yes, the vast majority of spatial imbalances can be addressed non-destructively through proper furniture reorientation, mirror positioning, indoor plants, lighting adjustments, and color balancing.',
      },
      {
        question: 'How does Ghar Ghar Vastu AI help with Vastu consultation?',
        answer: 'Ghar Ghar Vastu uses Gemini AI vision to inspect room photographs, verify compass orientations, identify placement conflicts, and recommend practical, culturally authentic remedies instantly.',
      },
    ],
    internalLinks: [
      { title: 'Vastu for Home Guide', path: '/vastu-for-home', description: 'Complete room-by-room blueprint for modern Indian houses.' },
      { title: 'Main Door Vastu', path: '/main-door-vastu', description: 'Rules for entrance direction, thresholds, and doorway energy.' },
      { title: 'Vastu Direction Guide', path: '/vastu-direction', description: 'Understand the 8 cardinal directions and their planetary rulers.' },
      { title: 'Top Vastu Tips', path: '/vastu-tips', description: 'Actionable tips for immediate harmony in apartments and flats.' },
    ],
    ctaText: 'Ask AI Vastu Shastra Questions',
    ctaQuery: 'What are the basic rules of Vastu Shastra for my apartment?',
  },

  'vastu-for-home': {
    slug: 'vastu-for-home',
    path: '/vastu-for-home',
    title: 'Vastu for Home – Complete House Harmony, Room Placements & Remedies',
    metaDescription: 'Complete Vastu for Home guide: room-by-room layout for entrance, kitchen, bedroom, pooja room, and bathrooms. Learn practical non-destructive remedies.',
    h1: 'Vastu for Home: Complete Room-by-Room Layout & Remedies',
    subtitle: 'Comprehensive spatial guide for independent houses, flats, and modern apartments',
    hindiTitle: 'घर का वास्तु: कमरे, दिशाएं और सरल उपाय',
    badge: 'Homeowner Blueprint',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'Designing or living in a home aligned with Vastu Shastra (घर का वास्तु) ensures that every space fulfills its natural function without conflict. Whether you reside in a 2BHK flat, a modern studio apartment, or an independent villa, understanding the ideal zones for the master bedroom, kitchen, living hall, mandir, and entrance brings peace of mind and effortless daily living.',
    keyRule: 'Place high-activity spaces (entrance, living) in North/East, fire/energy (kitchen) in South-East, rest (bedrooms) in South-West, and spiritual clarity (mandir) in North-East.',
    idealDirections: [
      {
        direction: 'Main Entrance',
        hindiName: 'मुख्य द्वार',
        verdict: 'Best',
        explanation: 'North, East, or North-East. Welcomes positive natural illumination and comfortable airflow.',
      },
      {
        direction: 'Master Bedroom',
        hindiName: 'मास्टर बेडरूम',
        verdict: 'Best',
        explanation: 'South-West (Nairutya). Traditionally associated with stability, privacy, and restorative rest.',
      },
      {
        direction: 'Kitchen Hearth',
        hindiName: 'रसोईघर',
        verdict: 'Best',
        explanation: 'South-East (Agni Kon). Cook facing East to absorb refreshing morning sunlight.',
      },
      {
        direction: 'Pooja Ghar / Mandir',
        hindiName: 'पूजा घर',
        verdict: 'Best',
        explanation: 'North-East (Ishan Kon). The quietest quadrant for contemplation and spiritual focus.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Master Bedroom Grounding',
        description: 'The primary bedroom is traditionally placed in the South-West quadrant. Heavy furniture like solid wood wardrobes and storage units should sit along the South and West walls of this room.',
        remedyTip: 'Sleep with head directed South or East for optimal circadian alignment.',
      },
      {
        title: 'Separation of Fire and Water',
        description: 'In the kitchen, the gas stove (Fire element) and the washing sink (Water element) should have adequate clearance between them.',
        remedyTip: 'Maintain a minimum 2 to 3 feet gap. If adjacent, place a wooden cutting board or small green indoor plant between them.',
      },
      {
        title: 'De-cluttering the Brahmasthan',
        description: 'Keep the center of your house free of massive spiral staircases, heavy pillars, or sunken toilets to allow open spatial flow.',
        remedyTip: 'Decorate the central living area with low-profile furniture and warm ivory tones.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Kitchen located in North-East (Water zone)',
        impact: 'In traditional Vastu, water and fire clash, which may create spatial friction and an awkward workflow in the home.',
        remedy: 'Place a bronze Sun symbol or brass decor on the wall, keep counters uncluttered, and use a green stone slab under the gas stove.',
      },
      {
        mistake: 'Master bedroom placed in North-East',
        impact: 'North-East receives early morning sun, which may lead to lighter, early morning awakenings.',
        remedy: 'Use blackout curtains, warm earthy linens, and place the bed towards the South-West wall of the room.',
      },
      {
        mistake: 'Main door opening outwards or blocked by shoe racks',
        impact: 'Restricts door swing and makes the entrance feel crowded upon arrival.',
        remedy: 'Keep shoe racks concealed inside closed cabinets and ensure the door opens smoothly inward.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Zoned Acoustic Privacy',
        advice: 'Position television zones and home theater equipment away from master bedrooms and children\'s study nooks to prevent evening sound bleed.',
      },
      {
        title: 'Kitchen Exhaust System',
        advice: 'Always install a powerful chimney or exhaust fan over the stove, regardless of cardinal direction, to maintain indoor air quality.',
      },
      {
        title: 'Electrical Panel Location',
        advice: 'Place the main circuit breaker (MCB) in an easily accessible, dry utility corridor away from moisture-heavy plumbing lines.',
      },
    ],
    faq: [
      {
        question: 'How do I check my home Vastu (Ghar ka Vastu kaise check kare)?',
        answer: 'Stand in the center of your home with a compass or use the Ghar Ghar Vastu compass tool. Divide the layout into 8 cardinal quadrants to map the entrance, kitchen, bedrooms, pooja room, and bathrooms against ideal zones.',
      },
      {
        question: 'Is a South-facing house always bad according to Vastu?',
        answer: 'No, this is a common myth. A South-facing home with an entrance located in the auspicious 3rd or 4th pada (Vitatha or Gruhakshat) can bring high energy, stability, and success.',
      },
      {
        question: 'Can Vastu principles be applied to rental flats?',
        answer: 'Absolutely. Rental homes benefit greatly from non-structural Vastu adjustments: shifting bed orientation, re-hanging mirrors on North/East walls, adding indoor plants, and balancing kitchen elements.',
      },
    ],
    internalLinks: [
      { title: 'Main Door Vastu', path: '/main-door-vastu', description: 'Entrance directions, thresholds, and doorway energy.' },
      { title: 'Bedroom Vastu Guide', path: '/bedroom-vastu', description: 'Restful sleep directions and wardrobe placement.' },
      { title: 'Kitchen Vastu Guide', path: '/kitchen-vastu', description: 'Stove, sink, and electrical appliance locations.' },
      { title: 'Bathroom Vastu Guide', path: '/bathroom-vastu', description: 'Toilet placement, drainage, and water balance.' },
    ],
    ctaText: 'Run AI Home Vastu Audit',
    ctaQuery: 'Audit my complete home layout for Vastu balance',
  },

  'main-door-vastu': {
    slug: 'main-door-vastu',
    path: '/main-door-vastu',
    title: 'Main Door Vastu – Entrance Direction, Door Placement & Energy Flow',
    metaDescription: 'Complete Main Door Vastu guide: auspicious entrance directions, door sizes, threshold importance, nameplate placement, and remedies for obstructions.',
    h1: 'Main Door Vastu: Entrance Directions, Guidelines & Remedies',
    subtitle: 'The primary gateway (Simha Dwara) of prosperity, health, and vital energy',
    hindiTitle: 'मुख्य द्वार का वास्तु: सही दिशा, नियम और अचूक उपाय',
    badge: 'Entrance Gateway',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'In Vastu Shastra, the main entrance door—historically revered as the Simha Dwara (Lion Gate)—is considered the mouth of the home. It is the decisive boundary where external energy enters the dwelling. An unobstructed, well-lit, and correctly oriented main door creates a welcoming atmosphere, visual clarity, and positive impressions for all family members.',
    keyRule: 'The main door should be larger than all other interior doors, open inward in a clockwise direction, and remain clean, well-lit, and free of shoes or clutter.',
    idealDirections: [
      {
        direction: 'North (Uttar)',
        hindiName: 'उत्तर दिशा (कुबेर द्वार)',
        verdict: 'Best',
        explanation: 'Ruled by Lord Kuber in tradition. Associated with career opportunities, commercial stability, and fresh ambient light.',
      },
      {
        direction: 'East (Purva)',
        hindiName: 'पूर्व दिशा (सूर्य द्वार)',
        verdict: 'Best',
        explanation: 'Welcomes the rising sun and daylight into the foyer, promoting morning alertness and positive social connection.',
      },
      {
        direction: 'North-East (Ishan)',
        hindiName: 'ईशान कोण',
        verdict: 'Best',
        explanation: 'Sacred quadrant. Highly auspicious in tradition for peace, intellectual focus, and family harmony.',
      },
      {
        direction: 'South-West (Nairutya)',
        hindiName: 'नैऋत्य कोण',
        verdict: 'Avoid',
        explanation: 'Earth stability zone. In classical Vastu, an entrance here requires grounding elements, warm illumination, and tidy organization.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Clockwise Inward Opening',
        description: 'The main door must open inward smoothly without making squeaking or groaning sounds. A clockwise swing welcomes guests into the home without friction.',
        remedyTip: 'Oil hinges regularly so the door swings silently and freely to at least 90 degrees.',
      },
      {
        title: 'The Sacred Threshold (Dehleez)',
        description: 'Classical Indian architecture mandates a raised wooden or marble threshold (dehleez). It prevents exterior dust and rainwater from blowing into the foyer.',
        remedyTip: 'Install a subtle 1-inch raised teak or stone threshold across the bottom of the doorway.',
      },
      {
        title: 'Bright Illumination & Nameplate',
        description: 'A well-illuminated entrance with a clean, readable nameplate creates an inviting entry experience for visitors and emergency services.',
        remedyTip: 'Use warm white (2700K–3000K) lighting above the doorway; avoid dark shadowy alcoves.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Shoe racks, garbage bins, or broken mops directly in front of door',
        impact: 'Creates visual clutter and unpleasant odors right at the home entrance.',
        remedy: 'Relocate shoe storage to a closed cabinet on the side; keep the immediate threshold spotless.',
      },
      {
        mistake: 'Main door facing an elevator, electric pole, or dead end',
        impact: 'May create sudden rushing foot traffic or visual harshness outside the front door.',
        remedy: 'Hang a subtle convex mirror or brass Swastik/Om above the frame on the exterior side and place a green plant.',
      },
      {
        mistake: 'Main door opening directly in line with back door or balcony',
        impact: 'Wind drafts blow straight through the house without circulating into living areas.',
        remedy: 'Place a decorative folding screen, lush green plant, or sheer curtain to gently buffer the flow.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Deadbolt & Security Clearance',
        advice: 'Install a heavy-duty deadbolt and wide-angle peephole or digital video doorbell at 55–60 inches height for household security.',
      },
      {
        title: 'Weatherstripping & Acoustic Seals',
        advice: 'Attach perimeter rubber weatherstrips to the door jamb to prevent hallway noise and air conditioning draft loss.',
      },
      {
        title: 'Foyer Shoe Storage Hygiene',
        advice: 'Use louvered or ventilated shoe cabinets to prevent odor buildup and shoe clutter near the entry threshold.',
      },
    ],
    faq: [
      {
        question: 'Which is the best direction for the main door according to Vastu?',
        answer: 'North, East, and North-East are traditionally considered the most auspicious directions for a main entrance, welcoming gentle daylight and comfortable ambient temperatures.',
      },
      {
        question: 'Can South or West entrances be auspicious?',
        answer: 'Yes! Vastu divides each direction into 8 sub-zones (padas). In the South, the 3rd and 4th padas (Vitatha and Gruhakshat) are considered favorable. In the West, Pushpadanta pada brings steady stability.',
      },
      {
        question: 'What symbols should be placed at the main door?',
        answer: 'Traditional auspicious motifs like the Swastika, Om, or Shubh-Labh made of brass or wood can be placed near the doorway to celebrate cultural heritage and welcome visitors.',
      },
    ],
    internalLinks: [
      { title: 'Vastu for Home Guide', path: '/vastu-for-home', description: 'Overall layout and room placements.' },
      { title: 'Vastu Direction Guide', path: '/vastu-direction', description: 'How to calculate your main door direction with a compass.' },
      { title: 'Vastu Tips for Flats', path: '/vastu-tips', description: 'Easy entrance remedies for rental apartments.' },
    ],
    ctaText: 'Analyze Main Door with AI',
    ctaQuery: 'Inspect my main door photo and tell me its Vastu score and remedies',
  },

  'bedroom-vastu': {
    slug: 'bedroom-vastu',
    path: '/bedroom-vastu',
    title: 'Bedroom Vastu – Sleeping Direction, Bed Placement & Peace of Mind',
    metaDescription: 'Master Bedroom Vastu tips: best sleeping direction (head towards South/East), bed placement rules, mirror reflections, wardrobe location, and soothing colors.',
    h1: 'Bedroom Vastu: Sleeping Direction, Bed Placement & Serenity',
    subtitle: 'Restorative sanctuary for deep sleep, marital harmony, and rejuvenation',
    hindiTitle: 'बेडरूम का वास्तु: सोने की सही दिशा और वास्तु नियम',
    badge: 'Rest & Serenity',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'We spend one-third of our lives sleeping. In Vastu Shastra, the master bedroom is treated as a restorative sanctuary where physical energy is recovered and peace of mind is nurtured. Proper bedroom layout coordinates quiet directional alignment with circadian sleep patterns to support sound rest, emotional stability, and vitality.',
    keyRule: 'Always sleep with your head positioned towards the South or East. Place the bed along a solid wall and avoid mirrors reflecting the sleeping body.',
    idealDirections: [
      {
        direction: 'Head Towards South (Dakshin)',
        hindiName: 'दक्षिण सिरहाना',
        verdict: 'Best',
        explanation: 'Traditional Vastu considers South head orientation supportive of restorative, calm sleep aligned with geomagnetic currents.',
      },
      {
        direction: 'Head Towards East (Purva)',
        hindiName: 'पूर्व सिरहाना',
        verdict: 'Best',
        explanation: 'Solar alignment. Welcomes morning natural light and supports focus, memory, and calm waking routines.',
      },
      {
        direction: 'Head Towards West (Pashchim)',
        hindiName: 'पश्चिम सिरहाना',
        verdict: 'Acceptable',
        explanation: 'Neutral alignment in Vastu tradition. Suitable for guest rooms or secondary bedrooms.',
      },
      {
        direction: 'Head Towards North (Uttar)',
        hindiName: 'उत्तर सिरहाना',
        verdict: 'Avoid',
        explanation: 'In traditional Vastu, sleeping with head pointing North is discouraged as it is believed to cause restless, disrupted sleep.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Solid Wall Headboard',
        description: 'Position your bed against a solid wall rather than beneath a drafty window or centered in mid-room without backing. A solid wall provides psychological and spatial grounding.',
        remedyTip: 'Use a solid wooden or upholstered headboard without sharp decorative metal edges.',
      },
      {
        title: 'Wardrobe & Heavy Almirah Placement',
        description: 'Heavy wardrobes, dressing units, and master safes should be stationed on the South or West walls of the bedroom to anchor those directions.',
        remedyTip: 'Leave the North and East portions of the bedroom spacious and light for free air circulation.',
      },
      {
        title: 'Calming Neutral Palette',
        description: 'Opt for soothing pastel tones—warm ivory, almond beige, soft sage green, or gentle rose. Avoid intense fiery reds or neon colors on bedroom walls.',
        remedyTip: 'Introduce soft ambient lighting (2700K) with warm fabric lampshades.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mirror directly reflecting the bed',
        impact: 'Can cause subconscious restlessness or startling shadows in the dark, disrupting sleep continuity.',
        remedy: 'Relocate the mirror to North or East walls, or cover the mirror with a decorative cloth before sleeping.',
      },
      {
        mistake: 'Sleeping under an exposed structural ceiling beam',
        impact: 'Creates an optical sensation of downward pressure, leading to subconscious tension.',
        remedy: 'Move bed away from the beam line, or conceal the beam with a false ceiling panel or canopy.',
      },
      {
        mistake: 'Electronic gadgets, routers, or work desks right next to pillow',
        impact: 'Screen glare and notification chimes interfere with melatonin production and deep rest.',
        remedy: 'Keep mobile phones at least 4 feet away; use an analog alarm clock.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Mattress Ergonomics & Firmness',
        advice: 'Pair directional alignment with a high-density orthotic mattress that supports spinal curvature and promotes restorative REM sleep.',
      },
      {
        title: 'Blackout Curtains & Thermal Lining',
        advice: 'Install double-track curtains with blackout backing to eliminate streetlight glare and keep bedroom temperatures consistent.',
      },
      {
        title: 'Walking Clearance Around Bed',
        advice: 'Maintain at least 24 inches of clear floor space on both sides of the bed for safe nighttime movement and easy bed-making.',
      },
    ],
    faq: [
      {
        question: 'Which is the best sleeping direction according to Vastu?',
        answer: 'South is traditionally considered the most restful direction to point your head while sleeping, followed closely by East. North is traditionally discouraged.',
      },
      {
        question: 'Where should the bed be placed in the bedroom?',
        answer: 'Place the bed against the South or West wall of the room, leaving ample walking space on both sides. Avoid placing the bed directly in line with the doorway.',
      },
      {
        question: 'What should I do if a mirror faces my bed?',
        answer: 'If the mirror cannot be moved, simply cover it with a light fabric throw, curtain, or screen at night to prevent sleep disturbance.',
      },
    ],
    internalLinks: [
      { title: 'Mirror Vastu Guide', path: '/mirror-vastu', description: 'Rules for mirrors in bedrooms, living rooms, and dressing areas.' },
      { title: 'Vastu Direction Guide', path: '/vastu-direction', description: 'Compass calibration for sleeping orientations.' },
      { title: 'Vastu for Home', path: '/vastu-for-home', description: 'Complete room placement guidelines.' },
    ],
    ctaText: 'Analyze My Bedroom with AI',
    ctaQuery: 'Analyze my bedroom photo for bed direction, mirror placement, and Vastu compliance',
  },

  'kitchen-vastu': {
    slug: 'kitchen-vastu',
    path: '/kitchen-vastu',
    title: 'Kitchen Vastu – Stove & Sink Direction, Agni Zone Guidelines',
    metaDescription: 'Complete Kitchen Vastu guide: optimal South-East Agni Kon placement, stove and sink distance rules, cook facing direction, refrigerator zone, and remedies.',
    h1: 'Kitchen Vastu: Stove Direction, Sink Harmony & Agni Zone',
    subtitle: 'Nourishing the hearth, culinary ergonomics, and domestic safety',
    hindiTitle: 'रसोई का वास्तु: सही दिशा, गैस चूल्हा और सिंक के नियम',
    badge: 'Fire & Nutrition',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'The kitchen is the culinary heart of every home. In Vastu Shastra, the kitchen embodies the sacred Fire element (Agni), governing cooking vitality, nourishment, and family warmth. A harmoniously designed kitchen promotes safe workflows, culinary enjoyment, and effortless meal preparation.',
    keyRule: 'Locate the kitchen in the South-East (Agni Kon) or North-West (Vayavya). Cook while facing East, and maintain safe physical separation between the stove and water sink.',
    idealDirections: [
      {
        direction: 'South-East (Agni Kon)',
        hindiName: 'आग्नेय कोण',
        verdict: 'Best',
        explanation: 'Natural home of the Fire element in classical Vastu. Morning solar warmth keeps countertops dry and hygienic.',
      },
      {
        direction: 'North-West (Vayavya Kon)',
        hindiName: 'वायव्य कोण',
        verdict: 'Acceptable',
        explanation: 'Air element alternative. Supports active kitchen ventilation when South-East is occupied.',
      },
      {
        direction: 'East (Purva)',
        hindiName: 'पूर्व दिशा',
        verdict: 'Acceptable',
        explanation: 'Morning solar rays help keep preparation counters dry and pleasant.',
      },
      {
        direction: 'North-East (Ishan Kon)',
        hindiName: 'ईशान कोण',
        verdict: 'Avoid',
        explanation: 'In traditional Vastu, North-East represents the Water element, making it an awkward location for heat and cooking equipment.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Cook Facing East',
        description: 'The cooking platform should be positioned so that you face East while preparing meals. Facing East welcomes invigorating morning sunlight and promotes focused food preparation.',
        remedyTip: 'Position the gas hob on the South-East counter facing East.',
      },
      {
        title: 'Separation of Fire and Water (Stove & Sink)',
        description: 'In traditional Vastu, Fire and Water are opposing elements. Practically, having a wet sink right next to hot oil presents grease-splatter and steam burn risks.',
        remedyTip: 'Maintain at least 2 to 3 feet between stove and sink. Use a wooden cutting board or heat-resistant glass partition as an elemental buffer.',
      },
      {
        title: 'Electrical Appliance Zone',
        description: 'Heavy heat-generating appliances (microwaves, ovens, toasters, mixer grinders) belong naturally on the South or South-East counter.',
        remedyTip: 'Keep the water filter, RO system, and drinking water pitcher in the North-East or North corner of the kitchen.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Gas stove placed directly next to the kitchen sink',
        impact: 'In traditional Vastu, fire and water elements clash; practically, water splashes near hot oil cause burn and slip hazards.',
        remedy: 'Place a wooden partition, cutting board, or mini plant between them. If on an L-counter, place stove on one leg and sink on the other.',
      },
      {
        mistake: 'Kitchen directly facing or sharing a wall with the toilet',
        impact: 'Unhygienic spatial proximity that can compromise food preparation peace of mind.',
        remedy: 'Keep toilet door permanently closed; add a tiled wall splashback or wooden panel on the kitchen side.',
      },
      {
        mistake: 'Dark, poorly lit cooking counters',
        impact: 'Insufficient visibility during chopping and cooking increases cutting hazards.',
        remedy: 'Install under-cabinet LED strip lights (4000K neutral white) for shadow-free countertop illumination.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Kitchen Chimney Suction & Ducting',
        advice: 'Install an auto-clean chimney with 1100+ m3/hr suction vented through an exterior wall with the shortest possible duct run.',
      },
      {
        title: 'LPG / Piped Natural Gas Safety',
        advice: 'Keep gas cylinders in an upright, well-ventilated bottom cabinet with a steel-braided hose, inspected every 2 years.',
      },
      {
        title: 'Non-Porous Countertop Sealing',
        advice: 'Seal granite or quartz countertops annually to prevent turmeric, oil, and citrus stains from penetrating the stone.',
      },
    ],
    faq: [
      {
        question: 'Which direction is best for the kitchen stove?',
        answer: 'Place the cooking stove in the South-East corner of the kitchen, arranged so that you face East while cooking.',
      },
      {
        question: 'Where should the refrigerator be kept in the kitchen?',
        answer: 'The refrigerator should ideally be placed in the South-West, South, or North-West quadrant of the kitchen. Avoid placing it in the North-East.',
      },
      {
        question: 'Can I have a kitchen in the North-West?',
        answer: 'Yes! North-West (Vayavya Kon) is the recognized second-best alternative for a kitchen in Vastu Shastra after South-East.',
      },
    ],
    internalLinks: [
      { title: 'Vastu for Home Guide', path: '/vastu-for-home', description: 'Overall layout and room placements.' },
      { title: 'Vastu Direction Guide', path: '/vastu-direction', description: 'Calibrating kitchen directions with phone compass.' },
      { title: 'Vastu Tips for Home', path: '/vastu-tips', description: 'Simple remedies for kitchen balance.' },
    ],
    ctaText: 'Analyze My Kitchen with AI',
    ctaQuery: 'Review my kitchen photo for stove, sink, and appliance placement according to Vastu',
  },

  'bathroom-vastu': {
    slug: 'bathroom-vastu',
    path: '/bathroom-vastu',
    title: 'Bathroom Vastu – Toilet Direction, Drainage & Element Balancing',
    metaDescription: 'Bathroom & Toilet Vastu guide: optimal North-West and West placements, toilet commode directions (North-South axis), drainage rules, and non-structural remedies.',
    h1: 'Bathroom & Toilet Vastu: Directions, Placements & Remedies',
    subtitle: 'Managing water drainage, elimination, and cleanliness with balance',
    hindiTitle: 'बाथरूम और टॉयलेट का वास्तु: सही दिशा और वास्तु उपाय',
    badge: 'Water & Drainage',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'In classical Vastu, bathrooms and toilets govern water drainage and personal hygiene. Because modern bathrooms combine high humidity with sanitary elimination, thoughtful layout choices mitigate excess dampness and ensure household freshness and physical cleanliness throughout the home.',
    keyRule: 'Locate toilets in North-West (Vayavya) or South of South-West (SSW). Sit facing North or South on the commode. Never place toilets in North-East or Brahmasthan.',
    idealDirections: [
      {
        direction: 'North-West (Vayavya)',
        hindiName: 'वायव्य कोण',
        verdict: 'Best',
        explanation: 'Air and elimination. Facilitates rapid clearance of steam, dampness, and moisture.',
      },
      {
        direction: 'West (Pashchim)',
        hindiName: 'पश्चिम दिशा',
        verdict: 'Acceptable',
        explanation: 'Drainage zone. Practical and balanced for secondary bathrooms and attached washrooms.',
      },
      {
        direction: 'South of South-West (SSW)',
        hindiName: 'दक्षिण-नैऋत्य',
        verdict: 'Best',
        explanation: 'The classical zone of disposal and detoxification in traditional texts.',
      },
      {
        direction: 'North-East (Ishan)',
        hindiName: 'ईशान कोण',
        verdict: 'Avoid',
        explanation: 'In traditional Vastu, North-East is reserved for calm and contemplative spaces. Modern non-structural remedies help manage dampness and ventilation.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Commode Axis (North-South)',
        description: 'Position the toilet seat along the North-South axis so the user faces either North or South while seated, respecting traditional orientation.',
        remedyTip: 'Align commode against South or West wall facing North.',
      },
      {
        title: 'Ventilation & Dryness',
        description: 'Damp, dark bathrooms breed microbial growth and unpleasant odors. Always provide an exhaust fan or window on the North or West wall.',
        remedyTip: 'Keep bathroom doors closed at all times to prevent moisture migration into bedrooms or halls.',
      },
      {
        title: 'Slopes and Drainage Direction',
        description: 'The bathroom floor should slope gently towards the North, East, or North-East to let bathwater drain smoothly without pooling.',
        remedyTip: 'Use light pastel tiles (white, sky blue, soft beige) instead of dark black or heavy red.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Toilet located in North-East (Ishan Kon)',
        impact: 'Traditional texts view this placement as unfavorable due to moisture and energy clash; proper exhaust fans and hygiene mitigate practical issues.',
        remedy: 'Keep a bowl of natural sea salt inside to absorb dampness, replace weekly, and ensure high-CFM exhaust fan.',
      },
      {
        mistake: 'Toilet sharing a common wall with pooja mandir or kitchen',
        impact: 'Sensory and culinary discomfort from shared plumbing noises and moisture.',
        remedy: 'Do not mount the pooja altar directly onto the shared wall. Create a 3-inch gap or install a wooden panel between the spaces.',
      },
      {
        mistake: 'Leaving toilet seat lid open permanently',
        impact: 'Allows aerosol plumes and humidity to diffuse into attached bedrooms.',
        remedy: 'Cultivate the habit of closing the commode lid immediately after flushing and keeping the door shut.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Anti-Slip Flooring Tiles',
        advice: 'Install textured, matte ceramic tiles with an R10 anti-slip rating to prevent dangerous bathroom fall injuries.',
      },
      {
        title: 'Waterproofing Membrane',
        advice: 'Apply dual-coat polymer cementitious waterproofing up to 7 feet high in shower wet areas during construction or renovation.',
      },
      {
        title: 'P-Trap Floor Drains',
        advice: 'Install deep-seal anti-cockroach floor traps with water barriers to prevent sewer gas backdrafts into the home.',
      },
    ],
    faq: [
      {
        question: 'Which is the worst direction for a toilet in Vastu?',
        answer: 'North-East (Ishan Kon) is the most critical direction to avoid for a toilet in classical Vastu, followed by the exact center of the house (Brahmasthan).',
      },
      {
        question: 'What direction should I face while using the commode?',
        answer: 'Vastu traditionally recommends facing either North or South while seated on the commode. Avoid facing East or West.',
      },
      {
        question: 'How can I fix a toilet in the wrong direction in an apartment?',
        answer: 'Use non-structural remedies: place a bowl of rock salt on a high dry shelf, keep the door closed, run an active exhaust fan, and keep the room brightly illuminated.',
      },
    ],
    internalLinks: [
      { title: 'Vastu for Home Guide', path: '/vastu-for-home', description: 'Overall room placement and zoning.' },
      { title: 'Vastu Direction Guide', path: '/vastu-direction', description: 'Understanding cardinal directions and compass reading.' },
      { title: 'Vastu Tips for Flats', path: '/vastu-tips', description: 'Simple remedies for bathroom dosh in apartments.' },
    ],
    ctaText: 'Analyze Bathroom Vastu with AI',
    ctaQuery: 'Check my bathroom and toilet photo for Vastu direction and remedies',
  },

  'mirror-vastu': {
    slug: 'mirror-vastu',
    path: '/mirror-vastu',
    title: 'Mirror Vastu – Ideal Directions, Placements & Bed Reflection Rules',
    metaDescription: 'Complete Mirror Vastu guide: optimal North and East wall placement, dressing table rules, why mirrors must not reflect beds, and quick remedies for reflections.',
    h1: 'Mirror Vastu: Ideal Wall Directions, Placement & Remedies',
    subtitle: 'Reflecting light, spatial expansiveness, and energetic clarity',
    hindiTitle: 'दर्पण / आईने का वास्तु: सही दिशा और प्लेसमेंट के नियम',
    badge: 'Reflection & Light',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'In Vastu Shastra, mirrors are associated with the Water element (Jal Tatva). Mirrors visually double whatever they reflect—be it natural morning sunlight, lush outdoor greenery, or dark cluttered corners. Placing mirrors consciously enhances spatial depth and visual brightness while preventing sudden nighttime reflections.',
    keyRule: 'Place mirrors on the North or East walls so they reflect daylight from those directions. Avoid placing a mirror directly facing the sleeping bed.',
    idealDirections: [
      {
        direction: 'North Wall (Uttar)',
        hindiName: 'उत्तर की दीवार',
        verdict: 'Best',
        explanation: 'Associated with Kuber in tradition. A mirror on the North wall facing South reflects ambient light and creates a feeling of expansiveness.',
      },
      {
        direction: 'East Wall (Purva)',
        hindiName: 'पूर्व की दीवार',
        verdict: 'Best',
        explanation: 'Welcomes the morning sun and daylight into darker interior spaces, enhancing vitality and visual warmth.',
      },
      {
        direction: 'North-East Wall',
        hindiName: 'ईशान कोण की दीवार',
        verdict: 'Acceptable',
        explanation: 'Accentuates light and openness in meditation, study, or living spaces.',
      },
      {
        direction: 'South or West Walls',
        hindiName: 'दक्षिण / पश्चिम दीवार',
        verdict: 'Avoid',
        explanation: 'Causes mirrors to face North or East, which classical Vastu considers less optimal for light reflection.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'No Reflection of the Sleeping Bed',
        description: 'A mirror reflecting the bed can create subconscious movement illusions at night, leading to disturbed sleep continuity.',
        remedyTip: 'Position the dressing table beside the bed or cover the mirror with a curtain or cloth at bedtime.',
      },
      {
        title: 'Reflect Pleasant Sights',
        description: 'Position mirrors where they capture views of lush greenery, daylight, or serene artwork. Avoid positioning mirrors where they reflect clutter or garbage bins.',
        remedyTip: 'Place a mirror in the dining room reflecting the dining table to symbolically celebrate food and family abundance.',
      },
      {
        title: 'Square or Rectangular Shapes',
        description: 'Vastu favors square or rectangular mirrors with clean wooden or metal frames. Avoid irregular, jagged, or triangular mirrors that distort reflections.',
        remedyTip: 'Mount mirrors at least 4 to 5 feet above the floor so reflections remain natural and upright.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mirror directly facing the main entrance door',
        impact: 'Can startle family members upon entry and visually bounces incoming natural light outward.',
        remedy: 'Move the mirror to an adjacent wall perpendicular to the entrance rather than directly facing the doorway.',
      },
      {
        mistake: 'Two mirrors placed directly facing each other',
        impact: 'Creates an infinite optical corridor that causes disorientation and visual restlessness.',
        remedy: 'Offset one mirror so their reflection paths do not intersect directly.',
      },
      {
        mistake: 'Using cracked, cloudy, or distorted glass mirrors',
        impact: 'Distorts visual clarity and self-image in the home.',
        remedy: 'Immediately replace broken or antique rusted mirrors with clear, high-grade float glass.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Secure Wall Mounting Hardware',
        advice: 'Always use heavy-duty wall anchors and double-bracket cleats rather than single picture-hanging nails when mounting heavy framed mirrors.',
      },
      {
        title: 'Anti-Fog Coatings for Bathrooms',
        advice: 'Install defogger heating pads behind bathroom mirrors to keep glass crystal-clear during warm, steamy showers.',
      },
      {
        title: 'Beveled Safety Edges',
        advice: 'Ensure frameless mirrors have polished beveled edges to prevent accidental skin cuts during cleaning.',
      },
    ],
    faq: [
      {
        question: 'Which wall is best for hanging a mirror according to Vastu?',
        answer: 'The North and East walls are traditionally the best walls for mounting mirrors, drawing in natural ambient daylight.',
      },
      {
        question: 'What if my dressing table mirror reflects the bed and cannot be moved?',
        answer: 'Simply place a decorative fabric cover, curtain, or stylish folding screen over the mirror when retiring to bed at night.',
      },
      {
        question: 'Can I keep a mirror in the dining room?',
        answer: 'Yes! A mirror on the North or East wall of the dining room reflecting the dining table is a popular design choice that enhances perceived dining space.',
      },
    ],
    internalLinks: [
      { title: 'Bedroom Vastu Guide', path: '/bedroom-vastu', description: 'Restful sleeping orientations and bed placement.' },
      { title: 'Vastu for Home', path: '/vastu-for-home', description: 'Complete room placement guidelines.' },
      { title: 'Vastu Tips for Home', path: '/vastu-tips', description: 'Quick decor adjustments for harmonious living.' },
    ],
    ctaText: 'Analyze Mirror Placement with AI',
    ctaQuery: 'Examine my room photo to check if my mirror placement is compliant with Vastu',
  },

  'vastu-direction': {
    slug: 'vastu-direction',
    path: '/vastu-direction',
    title: 'Vastu Direction Guide – 8 Cardinal Directions, Compass & Elemental Zones',
    metaDescription: 'Master the 8 Vastu directions: North, North-East (Ishan), East, South-East (Agni), South, South-West (Nairutya), West, North-West (Vayavya). How to check with a compass.',
    h1: 'Vastu Direction Guide: 8 Cardinal Zones & Elemental Balancing',
    subtitle: 'Accurate compass calibration, planetary rulers, and zoning for every room',
    hindiTitle: 'वास्तु दिशा चक्र: 8 दिशाएं, तत्व और कम्पास गाइड',
    badge: 'Directional Science',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'Directions form the bedrock of Vastu Shastra. The Earth rotates on its magnetic axis from West to East, immersed in cosmic solar radiation. By dividing any plot or apartment into 8 primary directions and the central Brahmasthan, Vastu creates an elemental grid that designates the most supportive location for domestic activities.',
    keyRule: 'Calibrate from the true center of your home using a magnetic or digital compass. Identify the 8 directional zones to place rooms in harmony with their natural elements.',
    idealDirections: [
      {
        direction: 'North-East (Ishan Kon) • Water',
        hindiName: 'ईशान कोण (जल तत्व)',
        verdict: 'Best',
        explanation: 'Associated with Jupiter in tradition. Ideal for meditation, mandir, study nooks, and clean water features.',
      },
      {
        direction: 'South-East (Agni Kon) • Fire',
        hindiName: 'आग्नेय कोण (अग्नि तत्व)',
        verdict: 'Best',
        explanation: 'Associated with Agni. Thermal and cooking warmth. Ideal for kitchen, gas stove, inverter, and electrical meters.',
      },
      {
        direction: 'South-West (Nairutya) • Earth',
        hindiName: 'नैऋत्य कोण (पृथ्वी तत्व)',
        verdict: 'Best',
        explanation: 'Heavy earth element in tradition. Stability and grounding. Ideal for master bedroom, heavy wardrobes, and safe storage.',
      },
      {
        direction: 'North-West (Vayavya) • Air',
        hindiName: 'वायव्य कोण (वायु तत्व)',
        verdict: 'Best',
        explanation: 'Movement and transitions. Ideal for guest rooms, pantry storage, and finished product packaging.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'How to Take an Accurate Compass Reading',
        description: 'Stand in the center of your house (Brahmasthan) away from large iron pillars, heavy metal speakers, or refrigerators that might distort magnetic needles.',
        remedyTip: 'Use the built-in Ghar Ghar Vastu digital compass or a standard magnetic compass held level at chest height.',
      },
      {
        title: 'The Ashta Dikpalas (8 Cardinal Guardians)',
        description: 'Each direction has a traditional guardian and elemental association: North (Water), East (Air/Solar), South (Earth/Fire), West (Water/Space).',
        remedyTip: 'Balance the dominant element of each zone with corresponding decor materials and natural lighting.',
      },
      {
        title: 'Slope and Weight Distribution (LOD Rule)',
        description: 'In classical architecture, the South and West sides carry heavier physical loads, while North and East remain lighter and open to daylight.',
        remedyTip: 'Keep heavy storage, overhead water tanks, and solid wardrobes in South-West; keep North-East clear.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the main door direction is the direction you face when leaving',
        impact: 'Inversion of coordinates leads to completely incorrect room diagnosis.',
        remedy: 'Vastu door direction is defined as the direction you face while looking outward from INSIDE your house through the open doorway.',
      },
      {
        mistake: 'Using magnetic compass too close to structural steel or phones',
        impact: 'Magnetic deviation of 15-30 degrees leads to skewed quadrant mapping.',
        remedy: 'Step into the center of the hall, remove metal bracelets or watches, and calibrate twice.',
      },
      {
        mistake: 'Treating a rectangular flat as a circle without finding the true center',
        impact: 'Misallocates corner zones like Ishan or Agni.',
        remedy: 'Use diagonal corner-to-corner intersection to find the exact geometric centroid of your floor plan.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Balcony Solar Shading',
        advice: 'South and West balconies receive intense afternoon thermal radiation. Install louvered exterior blinds or outdoor bamboo chick blinds.',
      },
      {
        title: 'Wind Direction & Window Operability',
        advice: 'Position casement windows to catch prevailing summer breezes (usually South-West or North-West across central and northern India).',
      },
      {
        title: 'True North vs Magnetic North',
        advice: 'Account for magnetic declination (typically 0.5 to 2 degrees across India), which is negligible for home furniture layout purposes.',
      },
    ],
    faq: [
      {
        question: 'How do I determine the exact center (Brahmasthan) of my house?',
        answer: 'Draw the perimeter boundary of your house on a floor plan. Draw two diagonal lines connecting opposite corners. The intersection point marks the geometric centroid and Brahmasthan.',
      },
      {
        question: 'What are the 5 natural elements in Vastu directions?',
        answer: 'The five elements (Panchabhutas) are: Water (North & North-East), Fire (South-East), Earth (South-West), Air (North-West), and Space (Center / Brahmasthan).',
      },
      {
        question: 'Can phone compass apps be trusted for Vastu?',
        answer: 'Modern smartphone magnetometers are accurate when calibrated away from strong electromagnetic appliances like microwaves or large steel beams.',
      },
    ],
    internalLinks: [
      { title: 'Vastu for Home Guide', path: '/vastu-for-home', description: 'Room-by-room layout matching cardinal zones.' },
      { title: 'Main Door Vastu', path: '/main-door-vastu', description: 'Entrance alignments based on compass directions.' },
      { title: 'Vastu Shastra Principles', path: '/vastu-shastra', description: 'Vedic foundations of spatial science.' },
    ],
    ctaText: 'Open Built-in Compass Tool',
    ctaQuery: 'Help me calibrate my home directions and explain what belongs in each zone',
  },

  'vastu-tips': {
    slug: 'vastu-tips',
    path: '/vastu-tips',
    title: 'Vastu Tips for Home – Quick, Practical & Non-Destructive Solutions',
    metaDescription: 'Top 15 practical Vastu tips for Indian homes and flats. Learn easy non-destructive remedies for living room, plants, wall clocks, mirrors, and financial growth.',
    h1: 'Vastu Tips for Home: Practical & Non-Destructive Solutions',
    subtitle: 'Simple, actionable adjustments for peace, positivity, and prosperity in flats and houses',
    hindiTitle: 'घर के लिए आवश्यक वास्तु टिप्स: आसान और प्रभावशाली उपाय',
    badge: 'Actionable Tips',
    disclaimerText: TOPIC_DISCLAIMER,
    intro: 'Vastu Shastra does not require tearing down walls or incurring heavy renovation expenses. The essence of practical Vastu (सरल वास्तु) lies in subtle, thoughtful adjustments to your living environment—optimizing furniture angles, clearing clutter, introducing living air-purifying plants, placing wall clocks mindfully, and balancing natural light.',
    keyRule: 'Keep the North-East clean, ensure the entrance is brightly lit, sleep with your head to the South or East, and introduce natural green plants in the East/North zones.',
    idealDirections: [
      {
        direction: 'Wall Clock Direction',
        hindiName: 'दीवार घड़ी',
        verdict: 'Best',
        explanation: 'Mount clocks on North or East walls to symbolize forward momentum and auspicious timing.',
      },
      {
        direction: 'Indoor Plants Placement',
        hindiName: 'इंडोर पौधे',
        verdict: 'Best',
        explanation: 'Place Money plants, Tulsi, and Peace Lilies in North, East, or North-East. Avoid thorny cacti indoors.',
      },
      {
        direction: 'Living Room Sofas',
        hindiName: 'सोफा सेट',
        verdict: 'Best',
        explanation: 'Position heavy seating against South and West walls; family and guests face North or East while talking.',
      },
      {
        direction: 'Shoe Rack Placement',
        hindiName: 'जूते-चप्पल रैक',
        verdict: 'Acceptable',
        explanation: 'Keep in West or North-West in an enclosed wooden cabinet. Avoid placing directly in front of main entrance doorway.',
      },
    ],
    goldenPrinciples: [
      {
        title: 'Morning Sunlight Infusion',
        description: 'Open windows in the East and North each morning for at least 20 minutes to purge stagnant night air and infuse the house with fresh natural light.',
        remedyTip: 'Use sheer white or linen curtains on East windows to filter gentle morning daylight.',
      },
      {
        title: 'The Power of Living Greenery',
        description: 'Plants like Holy Basil (Tulsi), Money Plant, Snake Plant, and Areca Palm filter indoor air and symbolize vitality and renewal.',
        remedyTip: 'Keep a healthy Tulsi plant in North-East or East; keep a Money plant in South-East in a soil pot.',
      },
      {
        title: 'Wall Clock Vastu Guidelines',
        description: 'A wall clock represents the rhythm of life and momentum. Never allow a clock to remain stopped with dead batteries.',
        remedyTip: 'Mount clocks on the North or East wall of the living room at eye level.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Keeping broken clocks, stopped watches, or fractured mirrors',
        impact: 'Subconsciously symbolizes stalled progress and neglect.',
        remedy: 'Replace batteries immediately or safely discard broken timepieces and mirrors.',
      },
      {
        mistake: 'Keeping thorny cacti or dying dried flowers as decor',
        impact: 'Dried flowers accumulate dust; sharp thorns create visually prickly environments.',
        remedy: 'Replace with vibrant fresh flowers or low-maintenance living indoor foliage like Jade or Money plant.',
      },
      {
        mistake: 'Heavy clutter stored beneath the bed',
        impact: 'Blocks airflow underneath the sleeping body and collects dust bunnies.',
        remedy: 'Clean underbed storage; avoid storing broken metal items or shoes directly under where you sleep.',
      },
    ],
    practicalConsiderations: [
      {
        title: 'Indoor Air Quality Monitoring',
        advice: 'Use indoor plants (Snake Plant, Spider Plant) in living areas and open windows daily to reduce volatile organic compounds (VOCs).',
      },
      {
        title: 'Emergency Lighting & Flashlights',
        advice: 'Keep a rechargeable LED emergency light in a known hallway outlet in case of evening power outages.',
      },
      {
        title: 'Fire Safety in Kitchen & Pooja Areas',
        advice: 'Keep a compact 1kg ABC dry-powder fire extinguisher mounted near the kitchen exit and never leave burning oil lamps unattended.',
      },
    ],
    faq: [
      {
        question: 'What are the 3 most important Vastu tips for any home?',
        answer: '1) Keep the entrance well-lit and clutter-free. 2) Sleep with your head pointing South or East. 3) Keep the North-East zone of the house clean, light, and open.',
      },
      {
        question: 'Which plants are considered good for home Vastu?',
        answer: 'Tulsi (Holy Basil), Money Plant, Areca Palm, Bamboo, Jade Plant, and Peace Lily are excellent for attracting vitality and clean air. Avoid thorny cacti indoors.',
      },
      {
        question: 'Where should the main wall clock be placed?',
        answer: 'The living room North or East wall is the ideal place for a wall clock. Avoid hanging clocks above doorways or on the South wall.',
      },
    ],
    internalLinks: [
      { title: 'Vastu for Home Guide', path: '/vastu-for-home', description: 'Comprehensive room layout blueprints.' },
      { title: 'Main Door Vastu', path: '/main-door-vastu', description: 'Entrance energy and threshold rules.' },
      { title: 'Bedroom Vastu Guide', path: '/bedroom-vastu', description: 'Sleeping directions and bed placement.' },
      { title: 'Vastu Direction Guide', path: '/vastu-direction', description: 'Compass guidelines and elemental zones.' },
    ],
    ctaText: 'Ask AI for Custom Vastu Tips',
    ctaQuery: 'Give me 5 custom Vastu tips for my living room and bedroom',
  },
};
