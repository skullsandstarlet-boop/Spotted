
import sys
sys.path.insert(0, '/home/user/backend')

import os
os.environ["DATABASE_URL"] = 'postgresql://neondb_owner:npg_0nMkqW7fdPTl@ep-hidden-truth-ax3m1yiz.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
os.environ["SCHEMA_NAME"] = 'public'

from sqlalchemy import create_engine, text
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext

# Import Base and models
from app.database import Base
from app import models  # noqa: F401 - registers models with Base.metadata

engine = create_engine('postgresql://neondb_owner:npg_0nMkqW7fdPTl@ep-hidden-truth-ax3m1yiz.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require')
try:
    with engine.connect() as conn:
        # Set search_path for schema isolation
        conn.execute(text('SET search_path TO ' + 'public'))
        conn.commit()

        # Configure migration context and compare
        mc = MigrationContext.configure(conn)
        diff = compare_metadata(mc, Base.metadata)

        if not diff:
            print("SCHEMA_VERIFIED")
        else:
            # Format diff for human readability
            print("SCHEMA_MISMATCH")
            for item in diff[:10]:  # Limit output
                print(f"  - {item}")
            if len(diff) > 10:
                print(f"  ... and {len(diff) - 10} more differences")
except Exception as e:
    print(f"VERIFICATION_ERROR: {e}")
    sys.exit(1)
