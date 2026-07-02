import { validateGuides } from '../lib/guides-validate';

const result = validateGuides();
process.exit(result.errors > 0 ? 1 : 0);
