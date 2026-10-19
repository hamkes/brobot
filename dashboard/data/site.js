const FEATURES = {
  'embed-messages': {
    emoji: '🎨',
    key: 'feat_embed',
    points: 4
  },
  'leveling-system': {
    emoji: '🏆',
    key: 'feat_level',
    points: 4
  },
  'self-assignable-role': {
    emoji: '🎭',
    key: 'feat_selfrole',
    points: 4
  },
  'welcome-messages': {
    emoji: '👋',
    key: 'feat_welcome',
    points: 4
  }
};

const LEGAL = {
  'privacy-policy': {
    key: 'privacy',
    sections: 7
  },
  'terms-of-use': {
    key: 'terms',
    sections: 8
  },
  'refund-policy': {
    key: 'refund',
    sections: 5
  }
};

function legalSections(doc) {
  return Array.from({ length: doc.sections }, (_, i) => ({
    id: `s${i + 1}`,
    titleKey: `legal_${doc.key}_s${i + 1}_t`,
    bodyKey: `legal_${doc.key}_s${i + 1}_b`
  }));
}

module.exports = { FEATURES, LEGAL, legalSections };
