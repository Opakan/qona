import { templateService } from '../services/template.service.js';

console.log('Testing TemplateService...');
const all = templateService.getAllTemplates();
console.log(`Total templates loaded: ${all.length}`);

const slackTemplates = templateService.searchTemplates('slack');
console.log(`Slack templates count: ${slackTemplates.length}`);
if (slackTemplates.length > 0) {
  console.log('Sample Slack template title:', slackTemplates[0].name || slackTemplates[0].title);
}

const podcastTemplate = templateService.getTemplateById('1000');
console.log('Template ID 1000 title:', podcastTemplate?.name || podcastTemplate?.title);
