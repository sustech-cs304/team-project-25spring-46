supabase使用教程
1. 在需要的.ts文件中写import supabase, { testSupabaseConnection } from './supabaseClient';（extension.ts中已写）
2. supabaseClient.ts中已经有配置好的api和url，无需改动
3. 将需要建的表SQL语句发给祝嘉诺，我到远程上执行
4. 直接在代码中使用supabase进行数据库的增删改，如：
```ts
const { data, error } = await supabase
						.from('users')
						.select('id, name, email, role, password')
						.eq('email', email)
						.single();

const { data: newUser, error: insertError } = await supabase
						.from('users')
						.insert({ name, email, password, role: 'student' })
						.select('id, name, email, role')
						.single();
```
具体使用方法可查询supabase的doc（https://supabase.com/docs/reference/javascript/select）
或者直接让ai来写