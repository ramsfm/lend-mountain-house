// The seven kinds of post. Each gets one color, one icon and one main action;
// everything else (cards, pins, sheets, chats, notifications) is shared.

const LEND_CATS = ["tools", "kitchen", "garden", "outdoors", "kids", "party", "tech", "home", "books", "other"];

export const KINDS = {
  lend: {
    label: "Lend", tag: "Borrow", plural: "Borrow", hue: 135, icon: "swap",
    blurb: "Something people can borrow", verb: "Ask to borrow", placeholder: "Cordless drill",
    categories: LEND_CATS, starterVerb: "wants to borrow", accept: "Accept", decline: "Decline", finish: "Mark as returned",
  },
  ask: {
    label: "Ask", tag: "Request", plural: "Requests", hue: 32, icon: "ask",
    blurb: "Something you need, or a question", verb: "I can help", placeholder: "Anyone have jumper cables?",
    categories: [...LEND_CATS.slice(0, -1), "recommendation", "other"], starterVerb: "can help", accept: "Yes please", decline: "No thanks", finish: "Mark as solved",
  },
  help: {
    label: "Help", tag: "Help", plural: "Help", hue: 243, icon: "hand",
    blurb: "A skill or favor you can offer", verb: "Request help", placeholder: "I can walk your dog",
    categories: ["tutoring", "pets", "yard", "tech", "moving", "repair", "sewing", "food", "childcare", "other"], starterVerb: "would like your help", accept: "Accept", decline: "Decline", finish: "Mark as done",
  },
  free: {
    label: "Free", tag: "Free", plural: "Free", hue: 345, icon: "gift",
    blurb: "Something to give away, including food", verb: "I'll take it", placeholder: "Free lemons on my porch",
    categories: ["food", "home", "kids", "garden", "clothes", "books", "other"], starterVerb: "would like it", accept: "Confirm", decline: "Decline", finish: "Mark as picked up",
  },
  sell: {
    label: "Sell", tag: "For sale", plural: "For sale", hue: 211, icon: "tag",
    blurb: "Something for sale, or a yard sale", verb: "Message seller", placeholder: "Kids' bike, $40",
    categories: [...LEND_CATS.slice(0, -1), "food", "other"], starterVerb: "is interested", accept: "Mark as sold", decline: "Decline", finish: "Mark as sold",
  },
  event: {
    label: "Event", tag: "Event", plural: "Events", hue: 280, icon: "calendar",
    blurb: "A block party, walk, sale or meetup", verb: "I'm going", placeholder: "Block party on Saturday",
    categories: ["party", "sport", "market", "garden", "meetup", "kids"],
  },
  alert: {
    label: "Alert", tag: "Alert", plural: "Alerts", hue: 4, icon: "bell",
    blurb: "Lost pet, outage, package or safety", verb: "", placeholder: "Lost cat: gray tabby",
    categories: ["lost_pet", "found_pet", "outage", "package", "safety", "roads"],
  },
};

export const KIND_ORDER = ["lend", "ask", "help", "free", "sell", "event", "alert"];

export const CATEGORY_LABELS = {
  tools: "Tools", kitchen: "Kitchen", garden: "Garden", outdoors: "Outdoors", kids: "Kids", party: "Party", tech: "Tech",
  home: "Home", books: "Books", other: "Other", food: "Food", clothes: "Clothes", recommendation: "Recommendation",
  tutoring: "Tutoring", pets: "Pets", yard: "Yard work", moving: "Moving", repair: "Repairs", sewing: "Sewing", childcare: "Childcare",
  sport: "Sport", market: "Sale", meetup: "Meetup",
  lost_pet: "Lost pet", found_pet: "Found pet", outage: "Outage", package: "Package", safety: "Safety", roads: "Roads",
};

// What an alert asks of everyone else.
export const ALERT_ACTIONS = {
  lost_pet: { label: "I've seen this pet", reaction: "seen", chat: "I think I saw your pet! Here's where:" },
  found_pet: { label: "That's mine!", chat: "That's my pet! I'm so relieved. Can I come get them?" },
  outage: { label: "Mine is out too", reaction: "same" },
  package: { label: "That's mine", chat: "I think that package is mine! When can I grab it?" },
  safety: { label: "Thanks for the heads-up", reaction: "thanks" },
  roads: { label: "Thanks for the heads-up", reaction: "thanks" },
};

/** Kilograms a typical item in a category weighs, for "kg not bought". */
export const CATEGORY_KG = { tools: 3, kitchen: 3, garden: 4, outdoors: 4, kids: 3, party: 5, tech: 1, home: 5, books: 1, food: 1.5, clothes: 2, other: 2 };

export const kindOf = (post) => KINDS[post?.kind] || KINDS.lend;
