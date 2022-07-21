import dotenv from 'dotenv'
import { writeFile } from 'fs';

dotenv.config();

if(!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    console.error("Please set CLIENT_ID and CLIENT_SECRET!");
    process.exit();
}

const content = `
export const environment = {
    clientId: "${process.env.CLIENT_ID}",
    clientSecret: "${process.env.CLIENT_SECRET}"
}
`;

writeFile('env.ts', content, 'utf8', (err) => {
    if (err) {
        console.error(err);
    }
});