#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => {
    resolve(answer);
  });
});

// Function to execute shell commands
const execute = (command) => {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
};

// Main function
const main = async () => {
  console.log('Setting up Supabase project for RevisePDF...');
  
  // Check if Supabase CLI is installed
  try {
    execute('supabase --version');
  } catch (error) {
    console.error('Supabase CLI is not installed. Please install it first.');
    console.log('You can install it with: npm install -g supabase');
    process.exit(1);
  }
  
  // Ask for Supabase project details
  const projectId = await prompt('Enter your Supabase project ID: ');
  const supabaseUrl = await prompt('Enter your Supabase URL: ');
  const supabaseAnonKey = await prompt('Enter your Supabase anon key: ');
  
  // Create .env.local file
  const envContent = `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;
  
  fs.writeFileSync('.env.local', envContent);
  console.log('.env.local file created successfully.');
  
  // Create storage buckets
  console.log('Creating storage buckets...');
  
  // Execute SQL schema
  console.log('Applying database schema...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  
  if (fs.existsSync(schemaPath)) {
    try {
      execute(`supabase db push --db-url postgresql://postgres:postgres@localhost:54322/postgres`);
      console.log('Database schema applied successfully.');
    } catch (error) {
      console.error('Error applying database schema.');
      console.error(error.message);
    }
  } else {
    console.error('Schema file not found.');
  }
  
  console.log('Supabase setup completed successfully!');
  console.log(`
Next steps:
1. Start your development server: npm run dev
2. Visit http://localhost:3000 to see your application
3. Sign up for an account to test the authentication flow
  `);
  
  rl.close();
};

main().catch(console.error);
