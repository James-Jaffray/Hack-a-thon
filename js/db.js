import postgres from 'postgres'
import 'dotenv'

const sql = postgres('postgres://username:password@host:port/database', {
    host: 'localhost',
    port: 5432,
    database: 'calhub',
    username: 'postgres',
    password: 'change_me'
});

export default sql