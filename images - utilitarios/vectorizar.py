
from pathlib import Path
import vtracer

directory = Path(
    r"I:\Image Downloader\Download-Image v1.0.0\images"
)

files = [
    "logos.png",
    "Pablo_Tellez_A.png",
]

for filename in files:
    source = directory / filename
    output = directory / f"{source.stem}_vector.svg"

    if not source.exists():
        print(f"NO ENCONTRADO: {source}")
        continue

    try:
        vtracer.convert_image_to_svg_py(
            str(source),
            str(output),
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=4,
            color_precision=6,
            path_precision=3,
        )

        if output.exists() and output.stat().st_size > 0:
            print(f"VECTOR CREADO: {output}")
            print(f"Tamaño: {output.stat().st_size:,} bytes")
        else:
            print(f"ERROR: No se generó {output}")

    except Exception as error:
        print(f"ERROR procesando {filename}: {error}")
