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
    const savedUrl =
      (await figma.clientStorage.getAsync('fv_api_url')) ||
      'https://framevault.bhaveshsharma.com';
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
  image_url?: string | null;
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
    const savedUrl =
      (await figma.clientStorage.getAsync('fv_api_url')) ||
      'https://framevault.bhaveshsharma.com';
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

  // Network fetch handled in Figma plugin sandbox
  if (msg.type === 'FETCH_PENDING') {
    try {
      const targetUrl = (msg.url || '').replace(/\/+$/, '');
      const token = msg.token || '';
      const response = await fetch(`${targetUrl}/api/figma/pending`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        figma.ui.postMessage({
          type: 'FETCH_PENDING_ERROR',
          error: (errJson as any).error || `HTTP ${response.status}: ${response.statusText}`,
        });
        return;
      }

      const data = await response.json();
      figma.ui.postMessage({
        type: 'FETCH_PENDING_SUCCESS',
        items: (data as any).items || [],
        count: (data as any).count || 0,
      });
    } catch (netErr: any) {
      figma.ui.postMessage({
        type: 'FETCH_PENDING_ERROR',
        error: netErr.message || 'Network request failed in sandbox',
      });
    }
    return;
  }

  // Create cards on Figma Canvas
  if (msg.type === 'CREATE_CARDS') {
    const items: PendingSyncPayload[] = msg.items || [];
    const targetUrl = (msg.url || '').replace(/\/+$/, '');
    const token = msg.token || '';

    if (items.length === 0) {
      figma.ui.postMessage({ type: 'ALL_SYNCED', count: 0 });
      return;
    }

    try {
      const targetPage = getOrCreateReferencePage();
      figma.currentPage = targetPage;

      // Safe font loading
      let fontRegular = { family: 'Inter', style: 'Regular' };
      let fontBold = { family: 'Inter', style: 'Bold' };

      try {
        await figma.loadFontAsync(fontRegular);
        await figma.loadFontAsync(fontBold);
      } catch {
        try {
          fontRegular = { family: 'Roboto', style: 'Regular' };
          fontBold = { family: 'Roboto', style: 'Bold' };
          await figma.loadFontAsync(fontRegular);
          await figma.loadFontAsync(fontBold);
        } catch (fontErr) {
          console.warn('Using system fallback font', fontErr);
        }
      }

      const categoryGroups: { [catName: string]: PendingSyncPayload[] } = {};
      for (const item of items) {
        const cat = item.category_name || 'Uncategorized';
        if (!categoryGroups[cat]) {
          categoryGroups[cat] = [];
        }
        categoryGroups[cat].push(item);
      }

      let catIndex = 0;
      let totalSynced = 0;
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

          // Duplicate check
          const existingNode = container.children.find(
            (c) => c.getPluginData('framevault:sync_key') === syncKey
          ) as FrameNode | undefined;

          let cardNode: FrameNode;

          if (existingNode) {
            cardNode = existingNode;
          } else {
            const col = i % cardsPerRow;
            const row = Math.floor(i / cardsPerRow);
            const posX = startX + col * (cardWidth + cardSpacing);
            const posY = startY + row * 440;

            cardNode = figma.createFrame();
            cardNode.name = `Frame: ${item.title}`;
            cardNode.x = posX;
            cardNode.y = posY;
            cardNode.resize(cardWidth, 400);

            // Styling
            cardNode.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.09, b: 0.12 } }];
            cardNode.strokes = [{ type: 'SOLID', color: { r: 0.18, g: 0.2, b: 0.25 } }];
            cardNode.strokeWeight = 1;
            cardNode.cornerRadius = 10;
            cardNode.layoutMode = 'VERTICAL';
            cardNode.primaryAxisSizingMode = 'AUTO';
            cardNode.counterAxisSizingMode = 'FIXED';
            cardNode.paddingTop = 14;
            cardNode.paddingBottom = 16;
            cardNode.paddingLeft = 14;
            cardNode.paddingRight = 14;
            cardNode.itemSpacing = 10;

            // Image placeholder rect
            const imgRect = figma.createRectangle();
            imgRect.name = 'Screenshot Still';
            imgRect.resize(332, 186);
            imgRect.cornerRadius = 6;
            imgRect.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.14, b: 0.18 } }];
            cardNode.appendChild(imgRect);

            // Category tag
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
            tagText.fontName = fontBold;
            tagText.characters = (item.category_name || 'UNCATEGORIZED').toUpperCase();
            tagText.fontSize = 9;
            tagText.fills = [{ type: 'SOLID', color: hexToRgb(item.category_color) }];
            tagFrame.appendChild(tagText);
            cardNode.appendChild(tagFrame);

            // Title
            const titleText = figma.createText();
            titleText.fontName = fontBold;
            titleText.characters = item.title;
            titleText.fontSize = 13;
            titleText.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.97 } }];
            titleText.layoutAlign = 'STRETCH';
            cardNode.appendChild(titleText);

            // Source URL
            if (item.source_url) {
              const sourceText = figma.createText();
              sourceText.fontName = fontRegular;
              sourceText.characters = `Source: ${item.source_url}`;
              sourceText.fontSize = 10;
              sourceText.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.55, b: 0.95 } }];
              sourceText.layoutAlign = 'STRETCH';
              try {
                sourceText.setRangeHyperlink(0, sourceText.characters.length, {
                  type: 'URL',
                  value: item.source_url,
                });
              } catch (_) {}
              cardNode.appendChild(sourceText);
            }

            // Notes
            if (item.notes) {
              const notesText = figma.createText();
              notesText.fontName = fontRegular;
              notesText.characters = `"${item.notes}"`;
              notesText.fontSize = 11;
              notesText.fills = [{ type: 'SOLID', color: { r: 0.65, g: 0.68, b: 0.74 } }];
              notesText.layoutAlign = 'STRETCH';
              cardNode.appendChild(notesText);
            }

            // Plugin metadata
            cardNode.setPluginData('framevault:sync_key', syncKey);
            cardNode.setPluginData('framevault:reference_id', item.reference_id);
            cardNode.setPluginData('framevault:category_id', item.category_id);

            container.appendChild(cardNode);
            createdNodes.push(cardNode);
          }

          // Asynchronously attach or update image via native createImageAsync
          const imgRect = cardNode.children.find((c) => c.name === 'Screenshot Still') as
            | RectangleNode
            | undefined;

          if (imgRect) {
            let imgHandle: Image | null = null;
            if (item.image_base64) {
              try {
                imgHandle = await figma.createImageAsync(item.image_base64);
              } catch (e) {
                console.warn('Base64 image creation fallback:', e);
              }
            }

            if (!imgHandle && item.image_url) {
              try {
                const fullUrl = item.image_url.startsWith('http')
                  ? item.image_url
                  : `${targetUrl}${item.image_url.startsWith('/') ? '' : '/'}${item.image_url}`;
                imgHandle = await figma.createImageAsync(fullUrl);
              } catch (e) {
                console.warn('URL image creation fallback:', e);
              }
            }

            if (imgHandle) {
              imgRect.fills = [
                {
                  type: 'IMAGE',
                  scaleMode: 'FILL',
                  imageHash: imgHandle.hash,
                },
              ];
            }
          }

          // Directly update backend sync status
          try {
            await fetch(`${targetUrl}/api/figma/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                reference_id: item.reference_id,
                category_id: item.category_id,
                figma_file_key: 'FRAMEVAULT_REFERENCE_BOARD',
                figma_node_id: cardNode.id,
                status: 'synced',
                last_error: null,
              }),
            });
          } catch (backendErr) {
            console.error('Failed to update sync status on backend:', backendErr);
          }

          totalSynced++;
          figma.ui.postMessage({
            type: 'CARD_CREATED',
            title: item.title,
            nodeId: cardNode.id,
            current: totalSynced,
            total: items.length,
          });
        }
      }

      if (createdNodes.length > 0) {
        figma.viewport.scrollAndZoomIntoView(createdNodes);
      }

      figma.ui.postMessage({
        type: 'ALL_SYNCED',
        count: totalSynced,
      });
    } catch (globalErr: any) {
      console.error('CREATE_CARDS error:', globalErr);
      figma.ui.postMessage({
        type: 'CREATE_CARDS_ERROR',
        error: globalErr.message || 'Error creating cards on canvas',
      });
    }
  }
};
