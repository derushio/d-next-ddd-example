import fs from 'fs';
import path from 'path';

async function main() {
  let dockerComposeYaml = (
    await fs.promises.readFile('./docker/compose.yaml')
  ).toString();

  dockerComposeYaml = dockerComposeYaml.replaceAll(
    'd-next-resources-volume',
    `${path.basename(process.cwd())}-volume`,
  );

  await fs.promises.writeFile('./docker/compose.yaml', dockerComposeYaml);
}

void main();
