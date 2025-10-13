import { initializeDatabase } from './db';
import { Commonbase, Embedding, CommonbaseMetadata } from './db/entities';
import { generateEmbedding } from './embeddings';
import { parseFile, ParsedFile } from './file-parser';

export class CommonbaseService {
  static async addEntry(data: string, metadata: CommonbaseMetadata = {}, embedding?: number[]): Promise<Commonbase> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);
      const embeddingRepo = dataSource.getRepository(Embedding);

      // Create new entry
      const newEntry = commonbaseRepo.create({
        data,
        metadata,
      });

      const savedEntry = await commonbaseRepo.save(newEntry);

      // Generate or use provided embedding
      try {
        let finalEmbedding: number[];

        if (embedding && Array.isArray(embedding) && embedding.length === 1536) {
          finalEmbedding = embedding;
        } else {
          finalEmbedding = await generateEmbedding(data);
        }

        const embeddingEntity = embeddingRepo.create({
          id: savedEntry.id,
          embedding: finalEmbedding,
        });

        await embeddingRepo.save(embeddingEntity);
      } catch (embeddingError) {
        console.error('Failed to process embedding:', embeddingError);
        // Continue without embedding rather than failing completely
      }

      return savedEntry;
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error;
    }
  }

  static async addFileEntry(filePath: string): Promise<Commonbase> {
    try {
      const parsedFile = await parseFile(filePath);

      // Create entry with file content and metadata
      return await this.addEntry(parsedFile.content, parsedFile.metadata);
    } catch (error) {
      console.error('Error adding file entry:', error);
      throw error;
    }
  }

  static async getEntry(id: string): Promise<Commonbase | null> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      const entry = await commonbaseRepo.findOne({
        where: { id }
      });

      return entry || null;
    } catch (error) {
      console.error('Error getting entry:', error);
      throw error;
    }
  }

  static async updateEntry(id: string, data?: string, metadata?: CommonbaseMetadata): Promise<Commonbase | null> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);
      const embeddingRepo = dataSource.getRepository(Embedding);

      const entry = await commonbaseRepo.findOne({ where: { id } });
      if (!entry) return null;

      // Update fields
      if (data !== undefined) {
        entry.data = data;
      }
      if (metadata !== undefined) {
        entry.metadata = metadata;
      }
      entry.updated = new Date();

      const updatedEntry = await commonbaseRepo.save(entry);

      // Regenerate embedding if data was updated
      if (data !== undefined) {
        try {
          const newEmbedding = await generateEmbedding(data);
          await embeddingRepo.update({ id }, { embedding: newEmbedding });
        } catch (embeddingError) {
          console.error('Failed to update embedding:', embeddingError);
        }
      }

      return updatedEntry;
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }

  static async deleteEntry(id: string): Promise<boolean> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      const result = await commonbaseRepo.delete({ id });
      return result.affected !== undefined && result.affected > 0;
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }

  static async listEntries(offset = 0, limit = 50): Promise<Commonbase[]> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      const entries = await commonbaseRepo.find({
        order: { created: 'DESC' },
        skip: offset,
        take: limit,
      });

      return entries;
    } catch (error) {
      console.error('Error listing entries:', error);
      throw error;
    }
  }

  static async searchEntries(query: string, limit = 20): Promise<Commonbase[]> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      // Full-text search using PostgreSQL
      const entries = await commonbaseRepo
        .createQueryBuilder('commonbase')
        .where('commonbase.data ILIKE :query', { query: `%${query}%` })
        .orWhere('commonbase.metadata::text ILIKE :query', { query: `%${query}%` })
        .orderBy('commonbase.created', 'DESC')
        .limit(limit)
        .getMany();

      return entries;
    } catch (error) {
      console.error('Error searching entries:', error);
      throw error;
    }
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

      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      // Use pgvector similarity search with threshold
      const results = await commonbaseRepo
        .createQueryBuilder('commonbase')
        .innerJoinAndSelect('embeddings', 'embedding', 'commonbase.id = embedding.id')
        .select([
          'commonbase.id',
          'commonbase.data',
          'commonbase.metadata',
          'commonbase.created',
          'commonbase.updated',
          '(1 - (embedding.embedding <=> :queryEmbedding)) as similarity'
        ])
        .where('(1 - (embedding.embedding <=> :queryEmbedding)) >= :threshold', {
          queryEmbedding: JSON.stringify(queryEmbedding),
          threshold: finalThreshold
        })
        .orderBy('embedding.embedding <=> :queryEmbedding', 'ASC')
        .limit(finalLimit)
        .setParameter('queryEmbedding', JSON.stringify(queryEmbedding))
        .getRawMany();

      // Map raw results back to Commonbase entities
      return results.map(result => {
        const entry = new Commonbase();
        entry.id = result.commonbase_id;
        entry.data = result.commonbase_data;
        entry.metadata = result.commonbase_metadata;
        entry.created = result.commonbase_created;
        entry.updated = result.commonbase_updated;
        return entry;
      });
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  static async getRandomEntries(limit = 10): Promise<Commonbase[]> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      const entries = await commonbaseRepo
        .createQueryBuilder('commonbase')
        .orderBy('RANDOM()')
        .limit(limit)
        .getMany();

      return entries;
    } catch (error) {
      console.error('Error getting random entries:', error);
      throw error;
    }
  }

  static async linkEntries(parentId: string, childId: string): Promise<void> {
    try {
      const dataSource = await initializeDatabase();
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      // Update parent's metadata to include child in links
      const parent = await commonbaseRepo.findOne({ where: { id: parentId } });
      if (parent) {
        const currentLinks = parent.metadata?.links || [];
        parent.metadata = {
          ...parent.metadata,
          links: [...new Set([...currentLinks, childId])],
        };
        parent.updated = new Date();
        await commonbaseRepo.save(parent);
      }

      // Update child's metadata to include parent in backlinks
      const child = await commonbaseRepo.findOne({ where: { id: childId } });
      if (child) {
        const currentBacklinks = child.metadata?.backlinks || [];
        child.metadata = {
          ...child.metadata,
          backlinks: [...new Set([...currentBacklinks, parentId])],
        };
        child.updated = new Date();
        await commonbaseRepo.save(child);
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

      const dataSource = await initializeDatabase();
      const embeddingRepo = dataSource.getRepository(Embedding);
      const commonbaseRepo = dataSource.getRepository(Commonbase);

      // Get the embedding for the current entry
      const entryEmbedding = await embeddingRepo.findOne({
        where: { id: entryId }
      });

      if (!entryEmbedding) {
        return [];
      }

      // Find similar entries using cosine similarity with threshold
      const results = await commonbaseRepo
        .createQueryBuilder('commonbase')
        .innerJoinAndSelect('embeddings', 'embedding', 'commonbase.id = embedding.id')
        .select([
          'commonbase.id',
          'commonbase.data',
          'commonbase.metadata',
          'commonbase.created',
          'commonbase.updated',
          '(1 - (embedding.embedding <=> :entryEmbedding)) as similarity'
        ])
        .where('commonbase.id != :entryId AND (1 - (embedding.embedding <=> :entryEmbedding)) >= :threshold', {
          entryId,
          entryEmbedding: JSON.stringify(entryEmbedding.embedding),
          threshold: finalThreshold
        })
        .orderBy('embedding.embedding <=> :entryEmbedding', 'ASC')
        .limit(finalLimit)
        .setParameter('entryEmbedding', JSON.stringify(entryEmbedding.embedding))
        .getRawMany();

      // Map raw results back to Commonbase entities
      return results.map(result => {
        const entry = new Commonbase();
        entry.id = result.commonbase_id;
        entry.data = result.commonbase_data;
        entry.metadata = result.commonbase_metadata;
        entry.created = result.commonbase_created;
        entry.updated = result.commonbase_updated;
        return entry;
      });
    } catch (error) {
      console.error('Error getting similar entries:', error);
      throw error;
    }
  }
}