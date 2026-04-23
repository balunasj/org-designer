#!/usr/bin/env python3
"""
Convert LDIF format to JSON for faster client-side parsing.
"""

import sys
import json


def parse_ldif(ldif_text):
    """Parse LDIF text into a list of user objects."""
    users = []
    current_user = None
    current_uid = None

    for line in ldif_text.split('\n'):
        line = line.strip()

        # Skip comments and empty lines
        if line.startswith('#') or not line:
            continue

        # New entry starts with 'dn:'
        if line.startswith('dn:'):
            # Save previous user if exists
            if current_user and current_uid:
                users.append(current_user)

            # Check if this is a user entry
            if 'uid=' in line and 'ou=users' in line:
                current_user = {'dn': line[3:].strip()}
                current_uid = None
            else:
                current_user = None
                current_uid = None

        elif current_user:
            # Parse field: value
            if ':' in line:
                field, value = line.split(':', 1)
                value = value.strip()

                if field == 'uid':
                    current_uid = value
                    current_user['uid'] = value
                elif field == 'manager':
                    # Extract uid from manager DN
                    if 'uid=' in value:
                        uid_start = value.find('uid=') + 4
                        uid_end = value.find(',', uid_start)
                        current_user['manager'] = value[uid_start:uid_end] if uid_end != -1 else value[uid_start:]
                    else:
                        current_user['manager'] = value
                elif field == 'rhatSocialURL':
                    # Handle multiple social URLs
                    if 'rhatSocialURL' not in current_user:
                        current_user['rhatSocialURL'] = []

                    # Parse format: "Type->URL" or just "URL"
                    if '->' in value:
                        type_part, url_part = value.split('->', 1)
                        current_user['rhatSocialURL'].append({
                            'type': type_part.strip(),
                            'url': url_part.strip()
                        })
                    else:
                        current_user['rhatSocialURL'].append({
                            'type': 'Other',
                            'url': value
                        })
                else:
                    current_user[field] = value

    # Don't forget the last user
    if current_user and current_uid:
        users.append(current_user)

    return users


def main():
    if len(sys.argv) > 1:
        # Read from file
        with open(sys.argv[1], 'r') as f:
            ldif_text = f.read()
    else:
        # Read from stdin
        ldif_text = sys.stdin.read()

    users = parse_ldif(ldif_text)

    # Output compact JSON (no extra whitespace)
    print(json.dumps(users, separators=(',', ':')))


if __name__ == '__main__':
    main()
