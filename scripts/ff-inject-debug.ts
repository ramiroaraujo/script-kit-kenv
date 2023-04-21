// Name: ff inject debug

import "@johnlindquist/kit";

// For each folder, filter out the ones that are not a Nest application

const allFolders = (await exec(`cd ~/FactoryFix && ls -d */`)).all.split('\n').map(folder => folder.replace('/', ''));

const validFolders = allFolders.map(async folder => {
    try {
        let path = home(`FactoryFix/${folder}/package.json`);
        const file = await readFile(path, 'utf-8');
        const packageJson = JSON.parse(file);

        return packageJson.dependencies['@nestjs/core'] ? folder : null;
    } catch (e) {
        return null;
    }
});

const folders = (await Promise.all(validFolders)).filter(Boolean);

const folder = await arg("Select a folder to inject the debug config", folders);

// Inject the debug config
const mainPath = home(`FactoryFix/${folder}/src/main.ts`);
const mainContent = await readFile(mainPath, 'utf-8');

// 1. Insert "app.enableShutdownHooks();" before the line "await app.listen(port, host)" in src/main.ts
const listenLineIndex = mainContent.indexOf('await app.listen');
const updatedMainContent = mainContent.slice(0, listenLineIndex) + 'app.enableShutdownHooks();\n' + mainContent.slice(listenLineIndex);

await writeFile(mainPath.replace('main.ts', 'main-copy.ts'), updatedMainContent, 'utf-8');

// 2. Replace the line that contains "export class AppModule {}" in src/app.module.ts with the following:
//    export class AppModule implements OnApplicationShutdown {
//      public async onApplicationShutdown(signal?: string): Promise<void> {
//        process.exit(2);
//      }
//    }
const appModulePath = home(`FactoryFix/${folder}/src/app.module.ts`);
const appModuleContent = await readFile(appModulePath, 'utf-8');

const exportClassIndex = appModuleContent.indexOf('export class AppModule');
const exportClassEndIndex = appModuleContent.indexOf('}', exportClassIndex) + 1;
const updatedAppModuleContent = appModuleContent.slice(0, exportClassIndex) +
    `export class AppModule implements OnApplicationShutdown {
  public async onApplicationShutdown(signal?: string): Promise<void> {
    process.exit(2);
  }
}` +
    appModuleContent.slice(exportClassEndIndex);

// 3. In src/app.module.ts, add the following import: import { OnApplicationShutdown } from '@nestjs/common';
const importIndex = appModuleContent.indexOf('@nestjs/common') + '@nestjs/common'.length;
const finalAppModuleContent = updatedAppModuleContent.slice(0, importIndex) + ', OnApplicationShutdown' + updatedAppModuleContent.slice(importIndex);

await writeFile(appModulePath.replace('app.module.ts', 'app.module-copy.ts'), finalAppModuleContent, 'utf-8');

// Edit package.json
const packageJsonPath = home(`FactoryFix/${folder}/package.json`);
const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
const startDebugRegex = /("start:debug":\s*)"nest start --debug --watch"/;

if (startDebugRegex.test(packageJsonContent)) {
    const updatedPackageJsonContent = packageJsonContent.replace(startDebugRegex, '$1nest start --debug=0.0.0.0 --watch');
    await writeFile(packageJsonPath.replace('package.json', 'package-copy.json'), updatedPackageJsonContent, 'utf-8');
}

// Edit docker-compose.yml
const dockerComposePath = home(`FactoryFix/${folder}/docker-compose.yml`);
const dockerComposeContent = await readFile(dockerComposePath, 'utf-8');

const debugPortRegex = /(-\s+')\d+:(\d+)'/;
const debugPortReplacement = `$19229:9229'`;

const commandRegex = /command: \['yarn', 'start:dev'\]/;
const commandReplacement = `command: ['yarn', 'start:debug']`;

const updatedDockerComposeContent = dockerComposeContent
    .replace(debugPortRegex, debugPortReplacement)
    .replace(commandRegex, commandReplacement);

await writeFile(dockerComposePath.replace('docker-compose.yml', 'docker-compose-copy.yml'), updatedDockerComposeContent, 'utf-8');

// Notify the user that the folders are being fetched
await notify("Fetching folders");
