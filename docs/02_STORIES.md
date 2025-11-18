# Voxel Diorama Generator - User Stories

This document breaks down the features of the Voxel Diorama Generator into user stories and details the UX/UI considerations for each.

## Features List
### AI-Powered Creation
#### Scene Generation and Modification via Chat

- **User Stories**
	- **Hobbyist:** As a creative hobbyist, I want to type "a small, cozy cabin in a snowy forest" so that I can quickly create a winter-themed diorama without needing 3D modeling skills.
	- **Tabletop Gamer:** As a Dungeon Master, I want to describe "a crumbling stone altar in the center of a dark cave" so that I can visualize a key location for my next game session.
	- **Concept Artist:** As a concept artist, I want to tell the AI to "make the house taller and add a chimney" so that I can iterate on my environmental designs rapidly.

##### UX/UI Considerations
- **Core Experience**
	- The user opens the app to a clean, inviting 3D space with a clearly visible chat input field.
	- Placeholder text in the chat input guides the user: "Describe the scene you want to create..."
	- When the user sends a prompt, it appears in the chat history, and an elegant loading indicator (e.g., a gently pulsating voxel animation) signifies that the AI is working.
	- The generated 3D diorama materializes in the viewport with a smooth build-up or fade-in animation, accompanied by a confirmation message from the AI in the chat.
	- The chat panel is designed to be semi-transparent and collapsible, ensuring it doesn't obstruct the view of the user's creation.

- **Advanced Use and Edge Cases**
	- **Ambiguous Prompts:** If a prompt is unclear, the AI will respond with clarifying questions to guide the user toward a better result.
	- **Generation Failures:** In case of an error, a user-friendly message will appear in the chat with a "Try Again" button.
	- **Long Prompts:** The chat input will dynamically expand to accommodate multi-line text, ensuring a comfortable typing experience.
	- **Conversation History:** The chat panel will be scrollable, providing a complete history of the creative conversation.

### 3D Environment
#### Scene Interaction and Exploration

- **User Stories**
	- **Hobbyist:** As a hobbyist, I want to easily rotate and zoom into my diorama so that I can inspect it from all angles and appreciate the details.
	- **Tabletop Gamer:** As a Dungeon Master, I want to pan across the scene so that I can explore the entire map I've generated.
	- **Concept Artist:** As a concept artist, I want the camera controls to feel smooth and responsive, so I can fluidly navigate the scene while evaluating my design.

##### UX/UI Considerations
- **Core Experience**
	- **Orbit:** Left-click (or one-finger drag on mobile) and drag to orbit the camera around the diorama's focal point.
	- **Zoom:** Use the mouse scroll wheel (or a two-finger pinch on mobile) to seamlessly zoom in and out.
	- **Pan:** Right-click (or two-finger drag on mobile) to pan the camera across the scene.
	- All camera movements will incorporate subtle damping to provide a smooth, natural, and high-quality feel.

- **Advanced Use and Edge Cases**
	- **Camera Constraints:** The camera will be intelligently constrained to prevent it from going below the ground plane or getting lost.
	- **Reset View:** A dedicated "Reset Camera" button and/or a keyboard shortcut will be available to instantly return to the default view.
	- **Focus on Selection:** Double-clicking a voxel will smoothly animate the camera to frame that specific point of interest.

### Voxel Manipulation
#### Voxel Selection and Targeted AI Editing

- **User Stories**
	- **Hobbyist:** As a hobbyist, I want to click on the roof of my generated house and tell the AI "make this roof red" so that I can change specific parts of my creation easily.
	- **Tabletop Gamer:** As a Dungeon Master, I want to select a group of trees and say "turn these into burnt, dead trees" to change the mood of the environment.
	- **Concept Artist:** As a concept artist, I want to select a large volume of air and ask the AI to "fill this area with a floating crystal formation" so I can add complex details to a specific region.

##### UX/UI Considerations
- **Core Experience**
	- Clicking on a voxel will instantly select it, indicated by a clean, translucent highlight.
	- The chat input can provide context, e.g., "Editing selected voxel. What's next?"
	- The user can then type a command, and the AI will apply the change precisely to the selected voxel(s).
	- Multi-selection is supported via a standard Shift-click interaction.

- **Advanced Use and Edge Cases**
	- **Selection Tools:** The UI will feature a small, unobtrusive toolbar to switch between selection modes: single voxel, box selection, and a brush tool for "painting" selections.
	- **Deselection:** An intuitive deselection process, such as clicking on an empty area or pressing the 'Escape' key.
	- **Visual Feedback:** The selection highlight will be aesthetically pleasing and clear, providing excellent visibility without obscuring the voxel's details.
	- **Contextual AI Prompts:** Upon selection, the AI might offer intelligent, contextual suggestions in the chat to streamline the creative workflow.
