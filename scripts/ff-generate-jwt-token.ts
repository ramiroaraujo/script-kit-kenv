// Name: ff Generate JWT Token

import "@johnlindquist/kit";

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

const dotenv = await npm('dotenv');
const jsonwebtoken = await npm('jsonwebtoken');

const envConfig = dotenv.parse(await readFile(home(`FactoryFix/${folder}/config.env`), 'utf-8'));

const jwtKeyId = envConfig["FF_JWT_KEY_ID"];
const jwtPrivKeyBase64 = envConfig["FF_JWT_PRIVKEY_BASE64"];
const jwtIssuer = envConfig["FF_JWT_ISSUER"];

const token = jsonwebtoken.sign({}, Buffer.from(jwtPrivKeyBase64, 'base64'), {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: jwtIssuer,
    audience: "https://ff-app-dev.appspot.com",
    keyid: jwtKeyId,
});

await clipboard.writeText(token);
await notify("JWT Token copied to clipboard");