import json
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
current_dir = os.getcwd()
if current_dir != script_dir:
    raise Exception

config_list = [
    ('nmk.json', 'nmk'),
    ('sakamiya.json', 'Sakamiya'),
    ('aliesrite.json', 'Aliesrite*'),
    ('juka_box.json', 'Juka_Box'),
    ('atily.json', 'atily'),
]

data = []
for json_filename, artist in config_list:
    json_filepath = f'part/{json_filename}'
    with open(json_filepath, 'r') as f:
        json_data = json.load(f)
    data += json_data

with open('score.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
