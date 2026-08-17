const { createClient } = require('@supabase/supabase-js');
const url = 'https://bsdmcxsvwtcjfznvomsv.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZG1jeHN2d3RjamZ6bnZvbXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU5Njk1OSwiZXhwIjoyMDk2MTcyOTU5fQ.F-clJ2OpcMRN8qPl_XmEqAJermM2Fosey7Zt7XvwtBg';
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('employees').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success! Table exists. Data:', data);
  }
}
check();
