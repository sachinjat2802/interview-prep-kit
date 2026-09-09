/**
 * Shared role-awareness utilities used across all client components
 * to adapt UI labels and content for both technical and non-technical roles.
 */

// Keywords that signal a software/engineering/data role
const TECH_ROLE_KEYWORDS = [
  'software', 'engineer', 'developer', 'devops', 'sre', 'data scientist',
  'data engineer', 'machine learning', 'ml engineer', 'ai engineer',
  'frontend', 'backend', 'full-stack', 'fullstack', 'full stack', 'architect',
  'cloud engineer', 'security engineer', 'platform engineer',
  'infrastructure', 'ios developer', 'android developer', 'programmer',
  'web developer', 'qa engineer', 'test engineer', 'automation engineer',
];

/**
 * Detects whether a role title indicates a technical/software position.
 */
export function isTechnicalRole(title: string): boolean {
  const lower = title.toLowerCase();
  return TECH_ROLE_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Returns role-appropriate category labels.
 * For tech roles: "System Design" | For non-tech roles: "Workflow & Process"
 */
export function getCategoryLabel(categoryId: string, roleTitle: string): string {
  const isTech = isTechnicalRole(roleTitle);

  const labels: Record<string, { tech: string; nonTech: string }> = {
    'technical': { tech: 'Technical', nonTech: 'Practical & Domain Skills' },
    'behavioural': { tech: 'Behavioural', nonTech: 'Behavioural' },
    'system-design': { tech: 'System Design', nonTech: 'Workflow & Process' },
    'company-fit': { tech: 'Company & Culture', nonTech: 'Company & Culture' },
  };

  const mapping = labels[categoryId];
  if (!mapping) return categoryId;
  return isTech ? mapping.tech : mapping.nonTech;
}

/**
 * Returns an array of category objects with role-aware labels.
 */
export function getCategoryOptions(roleTitle: string): Array<{ id: string; label: string }> {
  return [
    { id: 'technical', label: getCategoryLabel('technical', roleTitle) },
    { id: 'behavioural', label: getCategoryLabel('behavioural', roleTitle) },
    { id: 'system-design', label: getCategoryLabel('system-design', roleTitle) },
    { id: 'company-fit', label: getCategoryLabel('company-fit', roleTitle) },
  ];
}

/**
 * Returns role-appropriate sub-tab label for the overview radar tab.
 */
export function getRadarTabLabel(roleTitle: string): string {
  return isTechnicalRole(roleTitle) ? 'Tech Stack Radar' : 'Skills & Tools Radar';
}
