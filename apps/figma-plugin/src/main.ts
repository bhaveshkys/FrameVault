/// <reference types="@figma/plugin-typings" />

// Show the plugin UI iframe
figma.showUI(__html__, {
  width: 380,
  height: 560,
  themeColors: true,
});

// Immediately send stored settings on startup
async function initPlugin() {
  try {
    const savedUrl = (await figma.clientStorage.getAsync('fv_api_url')) || 'http://localhost:3000';
    const savedToken =
      (await figma.clientStorage.getAsync('fv_api_token')) ||
      'fv_live_7a9f8b2c4e1d3a5e6f8b0c2d4e6f8a0b';

    figma.ui.postMessage({
      type: 'LOADED_SETTINGS',
      url: savedUrl,
      token: savedToken,
    });
  } catch (err) {
    console.error('Failed to load settings from clientStorage:', err);
  }
}

initPlugin();

interface PendingSyncPayload {
  reference_id: string;
  category_id: string;
  category_name: string;
  category_color?: string | null;
  title: string;
  source_url?: string | null;
  notes?: string | null;
  image_base64?: string | null;
  imageBytes?: number[] | Uint8Array | null;
}

// Convert Hex string to Figma RGB (0-1)
function hexToRgb(hex?: string | null): RGB {
  if (!hex) return { r: 0.39, g: 0.40, b: 0.95 }; // Indigo fallback
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (clean.length === 3) {
    const r = ((bigint >> 8) & 15) * 17;
    const g = ((bigint >> 4) & 15) * 17;
    const b = (bigint & 15) * 17;
    return { r: r / 255, g: g / 255, b: b / 255 };
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r: r / 255, g: g / 255, b: b / 255 };
}

// Convert image payload to Uint8Array
function getUint8ArrayFromItem(item: PendingSyncPayload): Uint8Array | null {
  if (item.image_base64) {
    try {
      const clean = item.image_base64.replace(/^data:image\/[a-zA-Z0-9-.+]+;base64,/, '').trim();
      const binary = atob(clean);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error('Failed to decode base64 in sandbox:', e);
    }
  }
  if (item.imageBytes && item.imageBytes.length > 0) {
    return new Uint8Array(item.imageBytes);
  }
  return null;
}

// Helper to find or create the target page
function getOrCreateReferencePage(): PageNode {
  const pageName = 'FrameVault References';
  let targetPage = figma.root.children.find((p) => p.name === pageName) as PageNode | undefined;
  if (!targetPage) {
    targetPage = figma.createPage();
    targetPage.name = pageName;
  }
  return targetPage;
}

// Helper to find or create a section or frame for a category
function getOrCreateCategoryContainer(
  page: PageNode,
  categoryName: string,
  categoryIndex: number
): FrameNode | SectionNode {
  const containerName = `Section: ${categoryName}`;

  let container = page.children.find((n) => n.name === containerName) as
    | FrameNode
    | SectionNode
    | undefined;

  if (container) return container;

  const sectionX = categoryIndex * 900;
  const sectionY = 0;

  if (typeof (figma as any).createSection === 'function') {
    const section = (figma as any).createSection() as SectionNode;
    section.name = containerName;
    section.x = sectionX;
    section.y = sectionY;
    section.resizeWithoutConstraints(820, 1400);
    page.appendChild(section);
    return section;
  } else {
    const frame = figma.createFrame();
    frame.name = containerName;
    frame.x = sectionX;
    frame.y = sectionY;
    frame.resize(820, 1400);
    frame.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.06, b: 0.08 } }];
    frame.strokes = [{ type: 'SOLID', color: { r: 0.15, g: 0.17, b: 0.22 } }];
    frame.strokeWeight = 1;
    frame.cornerRadius = 16;
    page.appendChild(frame);
    return frame;
  }
}

// Main message router
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'GET_SETTINGS') {
    const savedUrl = (await figma.clientStorage.getAsync('fv_api_url')) || 'http://localhost:3000';
    const savedToken =
      (await figma.clientStorage.getAsync('fv_api_token')) ||
      'fv_live_7a9f8b2c4e1d3a5e6f8b0c2d4e6f8a0b';

    figma.ui.postMessage({
      type: 'LOADED_SETTINGS',
      url: savedUrl,
      token: savedToken,
    });
    return;
  }

  if (msg.type === 'SAVE_SETTINGS') {
    try {
      await figma.clientStorage.setAsync('fv_api_url', msg.url);
      await figma.clientStorage.setAsync('fv_api_token', msg.token);

      figma.ui.postMessage({
        type: 'SETTINGS_SAVED',
        url: msg.url,
        token: msg.token,
      });
    } catch (err: any) {
      figma.ui.postMessage({
        type: 'SETTINGS_SAVE_ERROR',
        error: err.message,
      });
    }
    return;
  }

  if (msg.type === 'CHECK_CONNECTION') {
    figma.ui.postMessage({
      type: 'CONNECTION_CHECKED',
      documentName: figma.root.name,
    });
    return;
  }

  if (msg.type === 'CREATE_CARDS') {
    const items: PendingSyncPayload[] = msg.items || [];
    const targetPage = getOrCreateReferencePage();
    figma.currentPage = targetPage;

    // Pre-load required fonts
    await Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
    ]).catch(async () => {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
    });

    const categoryGroups: { [catName: string]: PendingSyncPayload[] } = {};
    for (const item of items) {
      if (!categoryGroups[item.category_name]) {
        categoryGroups[item.category_name] = [];
      }
      categoryGroups[item.category_name].push(item);
    }

    let catIndex = 0;
    const createdNodes: SceneNode[] = [];

    for (const [categoryName, catItems] of Object.entries(categoryGroups)) {
      const container = getOrCreateCategoryContainer(targetPage, categoryName, catIndex);
      catIndex++;

      const cardsPerRow = 2;
      const cardWidth = 360;
      const cardSpacing = 24;
      const startX = 32;
      const startY = 80;

      for (let i = 0; i < catItems.length; i++) {
        const item = catItems[i];
        const syncKey = `${item.reference_id}:${item.category_id}`;

        // 1. Duplicate check: look for card with this sync_key
        const existingNode = container.children.find(
          (c) => c.getPluginData('framevault:sync_key') === syncKey
        ) as FrameNode | undefined;

        if (existingNode) {
          // If existing card is missing its image still, attach it now
          const hasImage = existingNode.children && existingNode.children.some((c) => c.name === 'Screenshot Still');
          const imageUint8 = getUint8ArrayFromItem(item);

          if (!hasImage && imageUint8 && imageUint8.length > 0) {
            try {
              const figmaImg = figma.createImage(imageUint8);
              const imgRect = figma.createRectangle();
              imgRect.name = 'Screenshot Still';
              imgRect.resize(332, 186);
              imgRect.cornerRadius = 6;
              imgRect.fills = [
                {
                  type: 'IMAGE',
                  scaleMode: 'FILL',
                  imageHash: figmaImg.hash,
                },
              ];
              // Insert image at the top of the card
              existingNode.insertChild(0, imgRect);
            } catch (fillErr) {
              console.error('Error attaching image to existing card:', fillErr);
            }
          }

          figma.ui.postMessage({
            type: 'ITEM_PROCESSED',
            reference_id: item.reference_id,
            category_id: item.category_id,
            figma_node_id: existingNode.id,
            status: 'synced',
            message: 'Card updated.',
          });
          continue;
        }

        try {
          const col = i % cardsPerRow;
          const row = Math.floor(i / cardsPerRow);
          const posX = startX + col * (cardWidth + cardSpacing);
          const posY = startY + row * 440;

          // 2. Create card frame (Auto-layout)
          const card = figma.createFrame();
          card.name = `Frame: ${item.title}`;
          card.x = posX;
          card.y = posY;
          card.resize(cardWidth, 400);

          // Card Dark Visual Styling
          card.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.09, b: 0.12 } }];
          card.strokes = [{ type: 'SOLID', color: { r: 0.18, g: 0.20, b: 0.25 } }];
          card.strokeWeight = 1;
          card.cornerRadius = 10;
          card.layoutMode = 'VERTICAL';
          card.primaryAxisSizingMode = 'AUTO';
          card.counterAxisSizingMode = 'FIXED';
          card.paddingTop = 14;
          card.paddingBottom = 16;
          card.paddingLeft = 14;
          card.paddingRight = 14;
          card.itemSpacing = 10;

          // 3. Create Screenshot Image Fill
          const imageUint8 = getUint8ArrayFromItem(item);
          if (imageUint8 && imageUint8.length > 0) {
            const figmaImg = figma.createImage(imageUint8);

            const imgRect = figma.createRectangle();
            imgRect.name = 'Screenshot Still';
            imgRect.resize(332, 186); // 16:9 cinema ratio
            imgRect.cornerRadius = 6;
            imgRect.fills = [
              {
                type: 'IMAGE',
                scaleMode: 'FILL',
                imageHash: figmaImg.hash,
              },
            ];
            card.appendChild(imgRect);
          }

          // 4. Category Tag Badge
          const tagFrame = figma.createFrame();
          tagFrame.name = 'Category Tag';
          tagFrame.layoutMode = 'HORIZONTAL';
          tagFrame.primaryAxisSizingMode = 'AUTO';
          tagFrame.counterAxisSizingMode = 'AUTO';
          tagFrame.paddingTop = 3;
          tagFrame.paddingBottom = 3;
          tagFrame.paddingLeft = 8;
          tagFrame.paddingRight = 8;
          tagFrame.cornerRadius = 4;
          tagFrame.fills = [{ type: 'SOLID', color: { r: 0.14, g: 0.16, b: 0.21 } }];

          const tagText = figma.createText();
          tagText.characters = item.category_name.toUpperCase();
          tagText.fontSize = 9;
          tagText.fontName = { family: 'Inter', style: 'Bold' };
          tagText.fills = [{ type: 'SOLID', color: hexToRgb(item.category_color) }];
          tagFrame.appendChild(tagText);
          card.appendChild(tagFrame);

          // 5. Title Text
          const titleText = figma.createText();
          titleText.characters = item.title;
          titleText.fontSize = 13;
          titleText.fontName = { family: 'Inter', style: 'Bold' };
          titleText.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.97 } }];
          titleText.layoutAlign = 'STRETCH';
          card.appendChild(titleText);

          // 6. Source Link
          if (item.source_url) {
            const sourceText = figma.createText();
            sourceText.characters = `Source: ${item.source_url}`;
            sourceText.fontSize = 10;
            sourceText.fontName = { family: 'Inter', style: 'Regular' };
            sourceText.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.55, b: 0.95 } }];
            sourceText.layoutAlign = 'STRETCH';
            sourceText.setRangeHyperlink(0, sourceText.characters.length, {
              type: 'URL',
              value: item.source_url,
            });
            card.appendChild(sourceText);
          }

          // 7. Research Notes
          if (item.notes) {
            const notesText = figma.createText();
            notesText.characters = `"${item.notes}"`;
            notesText.fontSize = 11;
            notesText.fontName = { family: 'Inter', style: 'Regular' };
            notesText.fills = [{ type: 'SOLID', color: { r: 0.65, g: 0.68, b: 0.74 } }];
            notesText.layoutAlign = 'STRETCH';
            card.appendChild(notesText);
          }

          // 8. Attach Stored Metadata to prevent future duplicates
          card.setPluginData('framevault:sync_key', syncKey);
          card.setPluginData('framevault:reference_id', item.reference_id);
          card.setPluginData('framevault:category_id', item.category_id);

          container.appendChild(card);
          createdNodes.push(card);

          figma.ui.postMessage({
            type: 'ITEM_PROCESSED',
            reference_id: item.reference_id,
            category_id: item.category_id,
            figma_node_id: card.id,
            status: 'synced',
          });
        } catch (itemError: any) {
          figma.ui.postMessage({
            type: 'ITEM_PROCESSED',
            reference_id: item.reference_id,
            category_id: item.category_id,
            status: 'failed',
            last_error: itemError.message || 'Error generating card in Figma',
          });
        }
      }
    }

    if (createdNodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(createdNodes);
    }
  }
};
