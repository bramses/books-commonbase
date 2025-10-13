import { getDb, type Commonbase, type CommonbaseMetadata } from './db';
import { generateEmbedding } from './embeddings';
import { parseFile } from './file-parser';
import { randomUUID } from 'crypto';

// Utility function for cosine similarity in JavaScript since SQLite doesn't have native vector ops
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export class CommonbaseService {
  static async addEntry(data: string, metadata: CommonbaseMetadata = {}, embedding?: number[]): Promise<Commonbase> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();
        const id = randomUUID();
        const now = new Date().toISOString();
        const metadataJson = JSON.stringify(metadata);

        // Insert new entry
        db.run(
          'INSERT INTO commonbase (id, data, metadata, created, updated) VALUES (?, ?, ?, ?, ?)',
          [id, data, metadataJson, now, now],
          function(err: any) {
            if (err) {
              console.error('Error adding entry:', err);
              reject(err);
              return;
            }

            const savedEntry: Commonbase = {
              id,
              data,
              metadata,
              created: now,
              updated: now
            };

            // Generate or use provided embedding
            const processEmbedding = async () => {
              try {
                let finalEmbedding: number[];

                if (embedding && Array.isArray(embedding) && embedding.length === 1536) {
                  finalEmbedding = embedding;
                } else {
                  finalEmbedding = await generateEmbedding(data);
                }

                db.run(
                  'INSERT INTO embeddings (id, embedding) VALUES (?, ?)',
                  [id, JSON.stringify(finalEmbedding)],
                  (embeddingErr: any) => {
                    if (embeddingErr) {
                      console.error('Failed to process embedding:', embeddingErr);
                      // Continue without embedding rather than failing completely
                    }
                    resolve(savedEntry);
                  }
                );
              } catch (embeddingError) {
                console.error('Failed to process embedding:', embeddingError);
                // Continue without embedding rather than failing completely
                resolve(savedEntry);
              }
            };

            processEmbedding();
          }
        );
      } catch (error) {
        console.error('Error adding entry:', error);
        reject(error);
      }
    });
  }

  static async addFileEntry(filePath: string): Promise<Commonbase> {
    try {
      const parsedFile = await parseFile(filePath);
      return await this.addEntry(parsedFile.content, parsedFile.metadata);
    } catch (error) {
      console.error('Error adding file entry:', error);
      throw error;
    }
  }

  static async getEntry(id: string): Promise<Commonbase | null> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();

        db.get(
          'SELECT * FROM commonbase WHERE id = ? LIMIT 1',
          [id],
          (err: any, row: any) => {
            if (err) {
              console.error('Error getting entry:', err);
              reject(err);
              return;
            }

            if (!row) {
              resolve(null);
              return;
            }

            const entry: Commonbase = {
              id: row.id,
              data: row.data,
              metadata: JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: row.updated
            };

            resolve(entry);
          }
        );
      } catch (error) {
        console.error('Error getting entry:', error);
        reject(error);
      }
    });
  }

  static async updateEntry(id: string, data?: string, metadata?: CommonbaseMetadata): Promise<Commonbase | null> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();
        const now = new Date().toISOString();

        // Check if entry exists first
        db.get('SELECT * FROM commonbase WHERE id = ?', [id], async (err: any, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }

          // Prepare SQL and parameters for update
          const updateFields = ['updated = ?'];
          const updateParams = [now];

          if (data !== undefined) {
            updateFields.push('data = ?');
            updateParams.push(data);
          }
          if (metadata !== undefined) {
            updateFields.push('metadata = ?');
            updateParams.push(JSON.stringify(metadata));
          }

          updateParams.push(id); // for WHERE clause

          const updateSQL = `UPDATE commonbase SET ${updateFields.join(', ')} WHERE id = ?`;

          db.run(updateSQL, updateParams, async function(updateErr: any) {
            if (updateErr) {
              reject(updateErr);
              return;
            }

            // Regenerate embedding if data was updated
            if (data !== undefined) {
              try {
                const newEmbedding = await generateEmbedding(data);
                db.run(
                  'UPDATE embeddings SET embedding = ? WHERE id = ?',
                  [JSON.stringify(newEmbedding), id],
                  (embeddingErr: any) => {
                    if (embeddingErr) {
                      console.error('Failed to update embedding:', embeddingErr);
                    }
                  }
                );
              } catch (embeddingError) {
                console.error('Failed to generate new embedding:', embeddingError);
              }
            }

            // Return updated entry
            const updatedEntry: Commonbase = {
              id,
              data: data !== undefined ? data : row.data,
              metadata: metadata !== undefined ? metadata : JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: now
            };

            resolve(updatedEntry);
          });
        });
      } catch (error) {
        console.error('Error updating entry:', error);
        reject(error);
      }
    });
  }

  static async deleteEntry(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();

        db.run('DELETE FROM commonbase WHERE id = ?', [id], function(err: any) {
          if (err) {
            console.error('Error deleting entry:', err);
            reject(err);
            return;
          }

          resolve(this.changes > 0);
        });
      } catch (error) {
        console.error('Error deleting entry:', error);
        reject(error);
      }
    });
  }

  static async listEntries(offset = 0, limit = 50): Promise<Commonbase[]> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();

        db.all(
          'SELECT * FROM commonbase ORDER BY created DESC LIMIT ? OFFSET ?',
          [limit, offset],
          (err: any, rows: any[]) => {
            if (err) {
              console.error('Error listing entries:', err);
              reject(err);
              return;
            }

            const entries: Commonbase[] = (rows || []).map(row => ({
              id: row.id,
              data: row.data,
              metadata: JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: row.updated
            }));

            resolve(entries);
          }
        );
      } catch (error) {
        console.error('Error listing entries:', error);
        reject(error);
      }
    });
  }

  static async searchEntries(query: string, limit = 20): Promise<Commonbase[]> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();
        const searchQuery = `%${query}%`;

        db.all(
          'SELECT * FROM commonbase WHERE data LIKE ? OR metadata LIKE ? ORDER BY created DESC LIMIT ?',
          [searchQuery, searchQuery, limit],
          (err: any, rows: any[]) => {
            if (err) {
              console.error('Error searching entries:', err);
              reject(err);
              return;
            }

            const entries: Commonbase[] = (rows || []).map(row => ({
              id: row.id,
              data: row.data,
              metadata: JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: row.updated
            }));

            resolve(entries);
          }
        );
      } catch (error) {
        console.error('Error searching entries:', error);
        reject(error);
      }
    });
  }

  static async semanticSearch(query: string, limit?: number, threshold?: number): Promise<Commonbase[]> {
    try {
      // Get settings from environment or defaults
      const fs = require('fs');
      const os = require('os');
      const path = require('path');

      let settings = { semanticSearchLimit: 20, semanticSearchThreshold: 0.7 };
      try {
        const settingsPath = path.join(os.homedir(), '.commonbase-electron', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settingsData = fs.readFileSync(settingsPath, 'utf-8');
          const savedSettings = JSON.parse(settingsData);
          settings = { ...settings, ...savedSettings };
        }
      } catch (e) {
        // Use defaults if settings can't be loaded
      }

      const finalLimit = limit || settings.semanticSearchLimit;
      const finalThreshold = threshold || settings.semanticSearchThreshold;

      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);

      // Get all entries with embeddings using raw SQL
      const entriesWithEmbeddings = await new Promise<any[]>((resolve, reject) => {
        const db = getDb();
        db.all(
          `SELECT c.id, c.data, c.metadata, c.created, c.updated, e.embedding
           FROM commonbase c
           INNER JOIN embeddings e ON c.id = e.id`,
          [],
          (err: any, rows: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            const processedRows = (rows || []).map(row => ({
              id: row.id,
              data: row.data,
              metadata: JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: row.updated,
              embedding: JSON.parse(row.embedding)
            }));

            resolve(processedRows);
          }
        );
      });

      // Calculate similarities and filter by threshold
      const results = entriesWithEmbeddings
        .map(entry => ({
          ...entry,
          similarity: cosineSimilarity(queryEmbedding, entry.embedding),
        }))
        .filter(entry => entry.similarity >= finalThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, finalLimit);

      // Return entries without embedding data
      return results.map(result => ({
        id: result.id,
        data: result.data,
        metadata: result.metadata,
        created: result.created,
        updated: result.updated,
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  static async getRandomEntries(limit = 10): Promise<Commonbase[]> {
    return new Promise((resolve, reject) => {
      try {
        const db = getDb();

        db.all(
          'SELECT * FROM commonbase ORDER BY RANDOM() LIMIT ?',
          [limit],
          (err: any, rows: any[]) => {
            if (err) {
              console.error('Error getting random entries:', err);
              reject(err);
              return;
            }

            const entries: Commonbase[] = (rows || []).map(row => ({
              id: row.id,
              data: row.data,
              metadata: JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: row.updated
            }));

            resolve(entries);
          }
        );
      } catch (error) {
        console.error('Error getting random entries:', error);
        reject(error);
      }
    });
  }

  static async linkEntries(parentId: string, childId: string): Promise<void> {
    try {
      // Update parent's metadata to include child in links
      const parent = await this.getEntry(parentId);
      if (parent) {
        const currentLinks = parent.metadata?.links || [];
        const updatedMetadata = {
          ...parent.metadata,
          links: [...new Set([...currentLinks, childId])],
        };

        const db = getDb();
        const now = new Date().toISOString();

        db.run(
          'UPDATE commonbase SET metadata = ?, updated = ? WHERE id = ?',
          [JSON.stringify(updatedMetadata), now, parentId],
          (err: any) => {
            if (err) {
              console.error('Failed to update parent metadata:', err);
            }
          }
        );
      }

      // Update child's metadata to include parent in backlinks
      const child = await this.getEntry(childId);
      if (child) {
        const currentBacklinks = child.metadata?.backlinks || [];
        const updatedMetadata = {
          ...child.metadata,
          backlinks: [...new Set([...currentBacklinks, parentId])],
        };

        const db = getDb();
        const now = new Date().toISOString();

        db.run(
          'UPDATE commonbase SET metadata = ?, updated = ? WHERE id = ?',
          [JSON.stringify(updatedMetadata), now, childId],
          (err: any) => {
            if (err) {
              console.error('Failed to update child metadata:', err);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error linking entries:', error);
      throw error;
    }
  }

  static async getSimilarEntries(entryId: string, limit?: number, threshold?: number): Promise<Commonbase[]> {
    try {
      // Get settings from environment or defaults
      const fs = require('fs');
      const os = require('os');
      const path = require('path');

      let settings = { semanticSearchLimit: 5, semanticSearchThreshold: 0.7 };
      try {
        const settingsPath = path.join(os.homedir(), '.commonbase-electron', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settingsData = fs.readFileSync(settingsPath, 'utf-8');
          const savedSettings = JSON.parse(settingsData);
          settings = { ...settings, ...savedSettings };
        }
      } catch (e) {
        // Use defaults if settings can't be loaded
      }

      const finalLimit = limit || settings.semanticSearchLimit;
      const finalThreshold = threshold || settings.semanticSearchThreshold;

      // Get the embedding for the current entry
      const entryEmbedding = await new Promise<any>((resolve, reject) => {
        const db = getDb();
        db.get(
          'SELECT embedding FROM embeddings WHERE id = ? LIMIT 1',
          [entryId],
          (err: any, row: any) => {
            if (err) {
              reject(err);
              return;
            }
            if (row) {
              resolve({ embedding: JSON.parse(row.embedding) });
            } else {
              resolve(null);
            }
          }
        );
      });

      if (!entryEmbedding) {
        return [];
      }

      // Get all other entries with embeddings using raw SQL
      const entriesWithEmbeddings = await new Promise<any[]>((resolve, reject) => {
        const db = getDb();
        db.all(
          `SELECT c.id, c.data, c.metadata, c.created, c.updated, e.embedding
           FROM commonbase c
           INNER JOIN embeddings e ON c.id = e.id
           WHERE c.id != ?`,
          [entryId],
          (err: any, rows: any[]) => {
            if (err) {
              reject(err);
              return;
            }

            const processedRows = (rows || []).map(row => ({
              id: row.id,
              data: row.data,
              metadata: JSON.parse(row.metadata || '{}'),
              created: row.created,
              updated: row.updated,
              embedding: JSON.parse(row.embedding)
            }));

            resolve(processedRows);
          }
        );
      });

      // Calculate similarities and filter by threshold
      const results = entriesWithEmbeddings
        .map(entry => ({
          ...entry,
          similarity: cosineSimilarity(entryEmbedding.embedding, entry.embedding),
        }))
        .filter(entry => entry.similarity >= finalThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, finalLimit);

      // Return entries without embedding data
      return results.map(result => ({
        id: result.id,
        data: result.data,
        metadata: result.metadata,
        created: result.created,
        updated: result.updated,
      }));
    } catch (error) {
      console.error('Error getting similar entries:', error);
      throw error;
    }
  }
}