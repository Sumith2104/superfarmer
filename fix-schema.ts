import { dbExecute } from './src/lib/fluxbase';

async function fixSchema() {
  try {
    console.log('Creating agent_memory table if it does not exist...');
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        agent VARCHAR(64),
        action_type VARCHAR(64),
        input_text TEXT,
        output_text TEXT,
        tools_used JSON,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    
    console.log('Attempting to add action_type column if missing...');
    try {
      await dbExecute('ALTER TABLE agent_memory ADD COLUMN action_type VARCHAR(64) AFTER agent', []);
      console.log('action_type column added.');
    } catch (err) {
      console.log('action_type column might already exist (or another error):', err.message);
    }

    console.log('Done fixing schema.');
  } catch (err) {
    console.error('Error fixing schema:', err);
  }
}

fixSchema();
