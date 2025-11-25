import os
import asyncio
import httpx
from openai import AsyncOpenAI
from PIL import Image
from io import BytesIO

# Prompt from Research Doc
PROMPT_TEMPLATE = """
Isometric view, {subject}, diorama style,
orthographic projection, 3D render,
studio lighting, white background,
high contrast, clean edges,
centered composition, single object focus,
{style_modifiers}
"""

def generate_voxel_optimized_prompt(user_input: str) -> str:
    subject = user_input
    style = "fantasy art style, detailed texture"
    return PROMPT_TEMPLATE.format(subject=subject, style_modifiers=style)

async def download_image(url: str) -> bytes:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content

async def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found.")
        return

    client = AsyncOpenAI(api_key=api_key)

    prompt = generate_voxel_optimized_prompt("majestic red dragon")
    print(f"Generating image with prompt: {prompt}")

    try:
        response = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard", # standard is cheaper/faster for testing
            n=1
        )

        image_url = response.data[0].url
        print(f"Image generated: {image_url}")

        image_data = await download_image(image_url)

        # Save to file
        image = Image.open(BytesIO(image_data))
        output_path = "tools/test_dragon.png"
        image.save(output_path)
        print(f"Image saved to {output_path}")

    except Exception as e:
        print(f"Failed to generate image: {e}")

if __name__ == "__main__":
    asyncio.run(main())
