import { logger } from '@hummer/cli-utils';
import * as fs from 'fs';
import * as zlib from 'zlib';
import archiver from 'archiver';

export async function archiveFile(path: string, fileName: string) {
  try {
    const gzip = zlib.createGzip();
    const input = fs.createReadStream(path + '/' + fileName + '.js');
    const output = fs.createWriteStream(path + '/' + fileName + '.gz');
    input.pipe(gzip).pipe(output);
  } catch (error) {
    logger.info('archive failure');
    throw error;
  }
}

export async function archive(path: string) {
  try {
    return new Promise<void>((resolve, reject) => {
      const archive = archiver('tar', { zlib: { level: 9 } });
      const output = fs.createWriteStream(path + '/' + 'hummer.zip');
      archive.pipe(output);

      archive.glob('*.js', { cwd: path });
      archive.finalize();
      archive.on('error', err => {
        logger.error(`archive failed-----${JSON.stringify(err)}`);
        reject(err);
      })
      archive.on('finish', () => {
        logger.info(`archive finished!`);
        resolve();
      })
    });
  } catch (error) {
    logger.error(`archive failed----${JSON.stringify(error)}`);
  }
}
