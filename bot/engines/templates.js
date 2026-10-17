const templates = [
  {
    id: 'gaming',
    emoji: '🎮',
    name: { en: 'Gaming & Community', ar: 'سيرفر ألعاب ومجتمع' },
    description: {
      en: 'A complete gaming hub with LFG rooms, voice lounges and MLBB / Rivals / PS5 rooms.',
      ar: 'مركز ألعاب كامل مع غرف البحث عن فريق، لاونجات صوتية، وغرف MLBB و Rivals و PS5.'
    },
    tags: {
      en: ['Community', 'Gaming', 'MLBB', 'PS5'],
      ar: ['مجتمع', 'ألعاب', 'MLBB', 'PS5']
    },
    roles: [
      { key: 'owner', name: '👑 Owner', color: '#F1C40F', hoist: true, mentionable: false, permissions: ['Administrator'] },
      { key: 'admin', name: '🛡️ Admin', color: '#ED4245', hoist: true, mentionable: false, permissions: ['ManageGuild', 'ManageChannels', 'ManageRoles', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ViewAuditLog'] },
      { key: 'mod', name: '⚔️ Moderator', color: '#3498DB', hoist: true, mentionable: false, permissions: ['KickMembers', 'ModerateMembers', 'ManageMessages', 'ViewAuditLog', 'MoveMembers'] },
      { key: 'vip', name: '⭐ VIP', color: '#FEE75C', hoist: true, mentionable: true, permissions: [] },
      { key: 'gamer', name: '🎮 Gamer', color: '#57F287', hoist: false, mentionable: true, permissions: [] },
      { key: 'member', name: '👤 Member', color: '#99AAB5', hoist: false, mentionable: true, permissions: [] }
    ],
    staffRoleKeys: ['owner', 'admin', 'mod'],
    categories: [
      {
        name: '📌 WELCOME & RULES',
        access: 'public',
        channels: [
          { type: 'text', name: '👋welcome', access: 'readonly', topic: 'Say hi to our newest members!' },
          { type: 'text', name: '📜rules', access: 'readonly', topic: 'Server rules — read before chatting.' },
          { type: 'text', name: '🎭self-roles', access: 'readonly', topic: 'Pick your roles here.' }
        ]
      },
      {
        name: '📢 ANNOUNCEMENTS',
        access: 'public',
        channels: [
          { type: 'text', name: '📢announcements', access: 'readonly', topic: 'Official server news.' },
          { type: 'text', name: '🎉events', access: 'readonly', topic: 'Upcoming events & tournaments.' }
        ]
      },
      {
        name: '💬 GENERAL CHATS',
        access: 'public',
        channels: [
          { type: 'text', name: '💬general', topic: 'Main chat — be friendly!' },
          { type: 'text', name: '🗨️off-topic', topic: 'Anything goes here.' },
          { type: 'text', name: '🎬clips-and-media', topic: 'Share your best clips.' },
          { type: 'text', name: '🤖bot-commands', topic: 'Use bot commands here.' }
        ]
      },
      {
        name: '🔊 VOICE LOUNGES',
        access: 'public',
        channels: [
          { type: 'voice', name: '🔊General VC' },
          { type: 'voice', name: '🎵Music VC' },
          { type: 'voice', name: '💤AFK VC' }
        ]
      },
      {
        name: '🎮 GAMING ROOMS (MLBB, Rivals, PS5)',
        access: 'public',
        channels: [
          { type: 'text', name: '🎮game-talk', topic: 'Talk about your favorite games.' },
          { type: 'text', name: '📣looking-for-group', topic: 'Find teammates — post your ID and rank.' },
          { type: 'voice', name: '🔵MLBB VC' },
          { type: 'voice', name: '⚔️Rivals VC' },
          { type: 'voice', name: '🎯PS5 VC' }
        ]
      },
      {
        name: '🛡️ STAFF AREA',
        access: 'staff',
        channels: [
          { type: 'text', name: '📋logs', access: 'staff', topic: 'Bot logs & mod actions.' },
          { type: 'text', name: '🚨reports', access: 'staff', topic: 'Member reports.' }
        ]
      },
      {
        name: '🎫 TICKETS',
        access: 'public',
        channels: [
          { type: 'text', name: '🎟️open-a-ticket', access: 'readonly', topic: 'Click the button below to open a ticket.' }
        ]
      }
    ],
    links: {
      welcome: '👋welcome',
      logs: '📋logs',
      autorole: 'member',
      ticketsCategory: '🎫 TICKETS',
      ticketPanel: '🎟️open-a-ticket',
      selfRolesChannel: '🎭self-roles',
      selfRoleKeys: ['vip', 'gamer']
    }
  },
  {
    id: 'store',
    emoji: '🛒',
    name: { en: 'Store & Digital Shop', ar: 'سيرفر متجر وخدمات' },
    description: {
      en: 'A clean storefront with products, order tickets, client chat and vouches.',
      ar: 'متجر منظم مع المنتجات، تذاكر الطلبات، محادثة العملاء، والتقييمات.'
    },
    tags: {
      en: ['Store', 'Services', 'Tickets', 'Support'],
      ar: ['متجر', 'خدمات', 'تذاكر', 'دعم']
    },
    roles: [
      { key: 'owner', name: '👑 Store Owner', color: '#F1C40F', hoist: true, mentionable: false, permissions: ['Administrator'] },
      { key: 'staff', name: '💼 Staff / Support', color: '#5865F2', hoist: true, mentionable: false, permissions: ['ManageChannels', 'ManageMessages', 'KickMembers', 'ModerateMembers', 'ViewAuditLog'] },
      { key: 'loyal', name: '⭐ Loyal Client', color: '#FEE75C', hoist: true, mentionable: true, permissions: [] },
      { key: 'customer', name: '💳 Customer', color: '#57F287', hoist: false, mentionable: true, permissions: [] }
    ],
    staffRoleKeys: ['owner', 'staff'],
    categories: [
      {
        name: '📌 INFO & POLICY',
        access: 'public',
        channels: [
          { type: 'text', name: '📌how-to-order', access: 'readonly', topic: 'Step-by-step ordering guide.' },
          { type: 'text', name: '📜terms-and-policy', access: 'readonly', topic: 'Store terms, refunds and policies.' },
          { type: 'text', name: '❓faq', access: 'readonly', topic: 'Frequently asked questions.' },
          { type: 'text', name: '📢announcements', access: 'readonly', topic: 'Store news & restocks.' }
        ]
      },
      {
        name: '📢 PRODUCTS & PRICES',
        access: 'public',
        channels: [
          { type: 'text', name: '🛍️products', access: 'readonly', topic: 'Everything we sell.' },
          { type: 'text', name: '💰prices', access: 'readonly', topic: 'Price list.' },
          { type: 'text', name: '🎁special-offers', access: 'readonly', topic: 'Limited-time deals.' }
        ]
      },
      {
        name: '🎟️ SUPPORT TICKETS',
        access: 'public',
        channels: [
          { type: 'text', name: '🎟️open-a-ticket', access: 'readonly', topic: 'Click the button below to open a ticket.' }
        ]
      },
      {
        name: '💬 CLIENT CHAT',
        access: 'public',
        channels: [
          { type: 'text', name: '💬general-chat', topic: 'Talk with the community.' },
          { type: 'text', name: '💬questions', topic: 'Ask anything about our products.' },
          { type: 'text', name: '🧾order-status', access: 'readonly', topic: 'Live order status updates.' }
        ]
      },
      {
        name: '⭐ REVIEWS & VOUCHES',
        access: 'public',
        channels: [
          { type: 'text', name: '⭐reviews', topic: 'Share your experience.' },
          { type: 'text', name: '🏅vouches', topic: 'Vouch for a completed deal.' },
          { type: 'text', name: '📸proofs', topic: 'Delivery proofs.' }
        ]
      },
      {
        name: '🛡️ STAFF AREA',
        access: 'staff',
        channels: [
          { type: 'text', name: '📋store-logs', access: 'staff', topic: 'Bot logs & mod actions.' },
          { type: 'text', name: '🗂️order-management', access: 'staff', topic: 'Track and fulfil orders.' }
        ]
      }
    ],
    links: {
      welcome: '📢announcements',
      logs: '📋store-logs',
      autorole: 'customer',
      ticketsCategory: '🎟️ SUPPORT TICKETS',
      ticketPanel: '🎟️open-a-ticket'
    }
  },
  {
    id: 'streamer',
    emoji: '🎬',
    name: { en: 'Content Creator & Live Streamer', ar: 'سيرفر صانع محتوى وبث مباشر' },
    description: {
      en: 'A creator home with live notifications, fan chat, clips and a stream lounge.',
      ar: 'بيت صانع المحتوى مع إشعارات البث، دردشة المعجبين، المقاطع، ولاونج البث.'
    },
    tags: {
      en: ['Streamer', 'YouTube', 'Twitch', 'Community'],
      ar: ['بث', 'يوتيوب', 'تويتش', 'مجتمع']
    },
    roles: [
      { key: 'streamer', name: '👑 Streamer', color: '#9146FF', hoist: true, mentionable: false, permissions: ['Administrator'] },
      { key: 'mod', name: '🛠️ Mod Team', color: '#5865F2', hoist: true, mentionable: false, permissions: ['ManageChannels', 'ManageMessages', 'KickMembers', 'ModerateMembers', 'ViewAuditLog'] },
      { key: 'sub', name: '💎 Sub / Member', color: '#EB459E', hoist: true, mentionable: true, permissions: [] },
      { key: 'fan', name: '🎥 Fan', color: '#57F287', hoist: false, mentionable: true, permissions: [] }
    ],
    staffRoleKeys: ['streamer', 'mod'],
    categories: [
      {
        name: '📌 WELCOME & SOCIALS',
        access: 'public',
        channels: [
          { type: 'text', name: '👋welcome', access: 'readonly', topic: 'Welcome to the community!' },
          { type: 'text', name: '📇my-socials', access: 'readonly', topic: 'All my social links.' },
          { type: 'text', name: '📢announcements', access: 'readonly', topic: 'Stream & community news.' }
        ]
      },
      {
        name: '🎥 YOUTUBE / TWITCH FEED',
        access: 'public',
        channels: [
          { type: 'text', name: '🔴live-notifications', access: 'readonly', topic: 'Get pinged when I go live.' },
          { type: 'text', name: '🎬new-videos', access: 'readonly', topic: 'Latest uploads.' },
          { type: 'text', name: '📅stream-schedule', access: 'readonly', topic: 'Weekly stream schedule.' }
        ]
      },
      {
        name: '💬 FAN CHAT',
        access: 'public',
        channels: [
          { type: 'text', name: '💬general-chat', topic: 'Chat with the community.' },
          { type: 'text', name: '🎨fan-art', topic: 'Post your fan art.' },
          { type: 'text', name: '📸clips', topic: 'Best moments & clips.' },
          { type: 'text', name: '💡suggestions', topic: 'Content ideas for the stream.' }
        ]
      },
      {
        name: '🔊 STREAM LOUNGE',
        access: 'public',
        channels: [
          { type: 'voice', name: '🔊stream-room' },
          { type: 'voice', name: '🎮gaming-vc' },
          { type: 'voice', name: '🎙️podcast-room' }
        ]
      },
      {
        name: '🎫 TICKETS',
        access: 'public',
        channels: [
          { type: 'text', name: '🎟️open-a-ticket', access: 'readonly', topic: 'Click the button below to open a ticket.' }
        ]
      },
      {
        name: '🛡️ STAFF AREA',
        access: 'staff',
        channels: [
          { type: 'text', name: '📋stream-logs', access: 'staff', topic: 'Bot logs & mod actions.' },
          { type: 'text', name: '🛠️mod-chat', access: 'staff', topic: 'Staff-only chat.' }
        ]
      }
    ],
    links: {
      welcome: '👋welcome',
      logs: '📋stream-logs',
      autorole: 'fan',
      ticketsCategory: '🎫 TICKETS',
      ticketPanel: '🎟️open-a-ticket'
    }
  },
  {
    id: 'minimal',
    emoji: '✨',
    name: { en: 'Minimalist & Modern', ar: 'سيرفر بسيط ومرتب' },
    description: {
      en: 'Only the essentials: clean chats, two voices and a tidy staff corner.',
      ar: 'الأساسيات فقط: دردشات نظيفة، رومات صوتية، وزاوية إدارة مرتبة.'
    },
    tags: {
      en: ['Minimal', 'Clean', 'Modern'],
      ar: ['بسيط', 'مرتب', 'عصري']
    },
    roles: [
      { key: 'admin', name: '🛡️ Admin', color: '#5865F2', hoist: true, mentionable: false, permissions: ['ManageGuild', 'ManageChannels', 'ManageRoles', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ViewAuditLog'] },
      { key: 'member', name: '👤 Member', color: '#99AAB5', hoist: false, mentionable: true, permissions: [] }
    ],
    staffRoleKeys: ['admin'],
    categories: [
      {
        name: '📌 MAIN',
        access: 'public',
        channels: [
          { type: 'text', name: '📢announcements', access: 'readonly', topic: 'Server news.' },
          { type: 'text', name: '📜rules', access: 'readonly', topic: 'Server rules.' }
        ]
      },
      {
        name: '💬 CHATS',
        access: 'public',
        channels: [
          { type: 'text', name: '💬general', topic: 'Main chat.' },
          { type: 'text', name: '🤖bot-commands', topic: 'Use bot commands here.' }
        ]
      },
      {
        name: '🔊 VOICE',
        access: 'public',
        channels: [
          { type: 'voice', name: '🔊General' },
          { type: 'voice', name: '💤AFK' }
        ]
      },
      {
        name: '🛡️ STAFF',
        access: 'public',
        channels: [
          { type: 'text', name: '📋logs', access: 'staff', topic: 'Bot logs & mod actions.' },
          { type: 'text', name: '🎫support-ticket', access: 'readonly', topic: 'Click the button below to open a ticket.' }
        ]
      }
    ],
    links: {
      welcome: '📢announcements',
      logs: '📋logs',
      autorole: 'member',
      ticketsCategory: '🛡️ STAFF',
      ticketPanel: '🎫support-ticket'
    }
  }
];

function getTemplate(id) {
  return templates.find((template) => template.id === id) || null;
}

module.exports = { templates, getTemplate };
