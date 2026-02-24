const seedEvents = [
  {
    id: "evt-robotics-001",
    eventName: "Robo Rally Sprint",
    description: "Autonomous bot races with timed checkpoints and obstacle zones.",
    type: "normal",
    eligibility: "open",
    reg_deadline: "2026-03-05T18:00:00.000Z",
    event_start: "2026-03-10T10:00:00.000Z",
    event_end: "2026-03-10T16:00:00.000Z",
    reg_limit: 120,
    reg_fee: 100,
    reg_count: 34,
    registrations24h: 9,
    organizer: {
      id: "org-robotics",
      name: "Robotics Club",
      category: "Tech",
      description: "Building and competing with autonomous systems.",
      email: "robotics@iiit.ac.in"
    },
    event_tags: ["Robotics", "Competition"]
  },
  {
    id: "evt-coding-002",
    eventName: "CodeStorm 24",
    description: "Overnight hack sprint with surprise challenges.",
    type: "normal",
    eligibility: "iiit",
    reg_deadline: "2026-02-28T20:00:00.000Z",
    event_start: "2026-03-01T18:00:00.000Z",
    event_end: "2026-03-02T18:00:00.000Z",
    reg_limit: 200,
    reg_fee: 0,
    reg_count: 88,
    registrations24h: 21,
    organizer: {
      id: "org-coding",
      name: "Coding Club",
      category: "Tech",
      description: "Competitive programming and dev marathons.",
      email: "codingclub@iiit.ac.in"
    },
    event_tags: ["Coding", "Hackathon"]
  },
  {
    id: "evt-design-003",
    eventName: "Design Systems Jam",
    description: "Create a cohesive design system for a live brief.",
    type: "normal",
    eligibility: "open",
    reg_deadline: "2026-03-18T12:00:00.000Z",
    event_start: "2026-03-20T09:30:00.000Z",
    event_end: "2026-03-20T15:00:00.000Z",
    reg_limit: 80,
    reg_fee: 50,
    reg_count: 20,
    registrations24h: 4,
    organizer: {
      id: "org-design",
      name: "Design Club",
      category: "Creative",
      description: "UI/UX and product design studios.",
      email: "designclub@iiit.ac.in"
    },
    event_tags: ["Design", "Workshop"]
  },
  {
    id: "evt-merch-004",
    eventName: "IIIT Hoodie Drop",
    description: "Limited edition hoodie sale for participants.",
    type: "merchandise",
    eligibility: "open",
    reg_deadline: "2026-03-30T23:00:00.000Z",
    event_start: "2026-03-01T09:00:00.000Z",
    event_end: "2026-03-31T19:00:00.000Z",
    reg_limit: 0,
    reg_fee: 799,
    reg_count: 56,
    registrations24h: 15,
    stock: 120,
    organizer: {
      id: "org-campus",
      name: "Campus Store",
      category: "Merchandise",
      description: "Official IIIT merchandise and essentials.",
      email: "store@iiit.ac.in"
    },
    event_tags: ["Merchandise", "Apparel"]
  },
  {
    id: "evt-music-005",
    eventName: "Indie Night Live",
    description: "Live stage performances with campus bands.",
    type: "normal",
    eligibility: "noniiit",
    reg_deadline: "2026-02-22T18:00:00.000Z",
    event_start: "2026-02-24T18:30:00.000Z",
    event_end: "2026-02-24T21:30:00.000Z",
    reg_limit: 150,
    reg_fee: 150,
    reg_count: 110,
    registrations24h: 18,
    organizer: {
      id: "org-music",
      name: "Music Club",
      category: "Culture",
      description: "Live music, jam sessions, and collaborations.",
      email: "musicclub@iiit.ac.in"
    },
    event_tags: ["Music", "Culture"]
  },
  {
    id: "evt-sports-006",
    eventName: "Campus Sports League",
    description: "Team-based sports league across multiple disciplines.",
    type: "normal",
    eligibility: "open",
    reg_deadline: "2026-03-12T15:00:00.000Z",
    event_start: "2026-03-15T07:00:00.000Z",
    event_end: "2026-03-22T19:00:00.000Z",
    reg_limit: 300,
    reg_fee: 0,
    reg_count: 140,
    registrations24h: 11,
    organizer: {
      id: "org-sports",
      name: "Sports Committee",
      category: "Sports",
      description: "Inter-hostel tournaments and sports events.",
      email: "sports@iiit.ac.in"
    },
    event_tags: ["Sports", "League"]
  }
];

export default seedEvents;
