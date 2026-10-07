const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'lib', 'clipadContextualizationService.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Update AI prompt to include relationships
content = content.replace(
  '"entities": [{"name": "Name", "type": "person|organization|project|topic"}],',
  `"entities": [{"name": "Name", "type": "person|organization|project|topic"}],
  "relationships": [{"source": "Entity1Name", "target": "Entity2Name", "type": "relates_to"}],`
);

// 2. Update default fallback extraction
content = content.replace(
  /{ entities: \[\], topics: \[\], possible_decisions: \[\], possible_actions: \[\], importance: 0.5, memory_candidate: false }/g,
  "{ entities: [], relationships: [], topics: [], possible_decisions: [], possible_actions: [], importance: 0.5, memory_candidate: false }"
);

// 3. Entity & Relationship integration logic
const entityLogic = `
    // 3. Entity & Relationship integration
    const entityMap = new Map();
    if (extraction.entities && extraction.entities.length > 0) {
      for (const ent of extraction.entities) {
        let entityType = ENTITY_TYPES.KNOWLEDGE;
        if (ent.type === 'person') entityType = ENTITY_TYPES.PERSON;
        if (ent.type === 'organization') entityType = ENTITY_TYPES.ORGANIZATION;
        if (ent.type === 'project') entityType = ENTITY_TYPES.PROJECT;

        const savedEntity = await upsertEntity({
          companyId: capture.company_id,
          entityType,
          name: ent.name,
          sourceId: \`capture_entity_\${ent.name.replace(/\\s+/g, '_').toLowerCase()}\`,
          visibility: capture.visibility === 'ORGANIZATIONAL' ? 'organization' : 'personal'
        });
        if (savedEntity && savedEntity.id) {
          entityMap.set(ent.name.toLowerCase(), savedEntity.id);
        }
      }
    }

    if (extraction.relationships && extraction.relationships.length > 0) {
      for (const rel of extraction.relationships) {
        const sourceId = entityMap.get((rel.source || '').toLowerCase());
        const targetId = entityMap.get((rel.target || '').toLowerCase());
        
        if (sourceId && targetId && sourceId !== targetId) {
          let rType = RELATIONSHIP_TYPES.RELATES_TO;
          const validTypes = Object.values(RELATIONSHIP_TYPES);
          if (validTypes.includes(rel.type)) {
            rType = rel.type;
          } else if (rel.type && rel.type.toUpperCase() in RELATIONSHIP_TYPES) {
            rType = RELATIONSHIP_TYPES[rel.type.toUpperCase()];
          }
          
          await createRelationship({
            companyId: capture.company_id,
            sourceEntityId: sourceId,
            targetEntityId: targetId,
            relationshipType: rType,
            confidence: 0.8,
            metadata: { source_capture_id: captureId }
          }).catch(err => console.warn('Failed to create relationship:', err.message));
        }
      }
    }
`;

content = content.replace(
  /\/\/ 3\. Entity integration[\s\S]*?\/\/ 4\. Memory Integration/m,
  entityLogic + '\n    // 4. Memory Integration'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated clipadContextualizationService.js for relationships');
