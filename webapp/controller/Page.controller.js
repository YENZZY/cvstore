sap.ui.define([
    "store/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator"
],
function (Controller, JSONModel, MessageBox, Filter, Fragment, FilterOperator) {
    "use strict";
 
    return Controller.extend("store.controller.Page", {
        onInit: function () {
            this.getRouter().getRoute("Page").attachMatched(this._onRouteMatched, this);
            var oProductModel = new JSONModel({
                ProductCollection: []
            });
            this.getView().setModel(oProductModel, "productModel");        
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this.Uuid = oArgs.Uuid;
            this.storeCode = oArgs.storeCode;
            this.storeName = oArgs.storeName;

            // 데이터를 가져오는 함수 호출
            this._getData();
        },

        //상세페이지 들어갈때 
        detailbtn : function() {
                this.byId("stocknow").setVisible(true);
                this.byId("itemorder").setVisible(false);
                this.byId("savebtn").setVisible(false);
        },

        //생성페이지 들어갈때
        createbtn : function() {
            this.byId("stocknow").setVisible(false);
            this.byId("itemorder").setVisible(true);
            this.byId("savebtn").setVisible(true);
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");
            
            //Uuid값이 있는 상세페이지
            if (this.Uuid) {
                var sPath = "/Head(guid'" + this.Uuid + "')";
                var iPath = "/Head(guid'" + this.Uuid + "')/to_Item";
                console.log(sPath);
                
                this.detailbtn();

                oMainModel.read(sPath, {
                    success: function (oData) {
                        var oStoreModel = new JSONModel(oData);
                        console.log("headitem",oStoreModel);
                        this.getView().setModel(oStoreModel, "storeModel");
                    
                    }.bind(this), // 컨텍스트 문제 해결
                    error: function () {
                        MessageBox.error("데이터를 불러올 수 없습니다.");
                    }
                });
                oMainModel.read(iPath, {
                    success: function (oData2) {
                        var oItemModel = new JSONModel(oData2.results);
                        console.log("itemss", oItemModel);
                        this.getView().setModel(oItemModel, "itemModel");
                    }.bind(this), // 컨텍스트 문제 해결
                    error: function () {
                        MessageBox.error("데이터를 불러올 수 없습니다.");
                    }
                });

                 // 편의점코드 및 편의점명을 select 컴포넌트에 바인딩
            this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                var storecodes = aGetData.filter(function (codedata) {
                    return codedata.StoreStatus === 'Y';
                }).map(function (codedata) {
                    return {
                        StoreCode: codedata.StoreCode,
                        StoreName: codedata.StoreName
                    };
                });
        
                var oCodeModel = new JSONModel({ storecodes: storecodes });
                this.getView().setModel(oCodeModel, "codeModel");
        
                var oStoreModel = this.getView().getModel("storeModel");
                if (oStoreModel) {
                    var oStoreData = oStoreModel.getData();
                    var selectStoreKey = aGetData.find(function (item) {
                        return item.StoreCode === oStoreData.StoreCode;
                    });
                    if (selectStoreKey) {
                        var oSelect = this.getView().byId("selectcvname");
                        oSelect.setSelectedKey(selectStoreKey.StoreCode);
                    }
                }
            }.bind(this)).catch(function () {
                MessageBox.error("브랜드명을 불러올 수 없습니다.");
            });

            // var icons = this.byId("stockicon");            
            // var itemData = this.getView().getModel("itemModel");
            //  // 재고 상태 조회
            //  if(10 <= itemData.ProductStock && itemData.ProductStock < 20){
            //     icons.setColor("yellow");
            // }else if(0 <= itemData.ProductStock && itemData.ProductStock < 10){
            //     icons.setColor("red");
            // }else{
            //     icons.setColor("green");
            // }

            //Uuid가 없는 생성페이지
            }else if (this.storeCode && this.storeName) {
               this.createbtn();
               this.clearSelectedProducts();
               // 편의점코드 및 편의점명을 select 컴포넌트에 바인딩
            this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                var storecodes = aGetData.filter(function (codedata) {
                    return codedata.StoreStatus === 'Y';
                }).map(function (codedata) {
                    return {
                        StoreCode: codedata.StoreCode,
                        StoreName: codedata.StoreName
                    };
                });
        
                var oCodeModel = new JSONModel({ storecodes: storecodes });
                this.getView().setModel(oCodeModel, "codeModel");
        
                var oStoreModel = this.getView().getModel("storeModel");
                if (oStoreModel) {
                    var oStoreData = oStoreModel.getData();
                    var selectStoreKey = aGetData.find(function (item) {
                        return item.StoreCode === oStoreData.StoreCode;
                    });
                    if (selectStoreKey) {
                        var oSelect = this.getView().byId("selectcvname");
                        oSelect.setSelectedKey(selectStoreKey.StoreCode);
                    }
                }
                
            }.bind(this)).catch(function () {
                MessageBox.error("브랜드명을 불러올 수 없습니다.");
            });
                // storeCode와 storeName을 사용하여 필요한 작업 수행
                // 예를 들어, 특정 데이터를 찾고 모델에 바인딩하는 로직 추가
                this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                    var oStoreData = aGetData.find(function (item) {
                        return item.StoreCode === this.storeCode && item.StoreName === this.storeName;
                    }.bind(this));

                    if (oStoreData) {
                        var oStoreModel = new JSONModel(oStoreData);
                        this.getView().setModel(oStoreModel, "storeModel");

                        // Select 컨트롤에 선택된 값을 설정하는 예시
                        var oSelect = this.getView().byId("selectcvname");
                        if (oSelect) {
                            oSelect.setSelectedKey(oStoreData.StoreCode);
                        }
                    } else {
                        MessageBox.error("해당 StoreCode와 StoreName을 찾을 수 없습니다.");
                    }
                }.bind(this)).catch(function () {
                    MessageBox.error("데이터를 불러올 수 없습니다.");
                });
            }
        },

        //생성 시 저장 버튼
        onSave: function() {
            var oMainModel = this.getOwnerComponent().getModel();
            var headData = this.getModel("storeModel").getData();
            var selectData = this.getModel("selectModel").getData();
            console.log("Header Data:", headData);
            console.log("Select Data:", selectData);
        
            oMainModel.create("/Head", {
                StoreCode: headData.StoreCode,
                StoreName: headData.StoreName,
                StoreBrname: headData.StoreBrname,
                StoreRegion: headData.StoreRegion,
                StorePhone: headData.StorePhone
            }, {
                success: function(headers) {
                    var headUuid = headers.Uuid;
                    console.log("Head UUID:", headUuid);
        
                    selectData.items.forEach(function(item) {
                        var newItemData = {
                            ProductCode: item.ProductCode,
                            ProductCategory: item.ProductCategory,
                            ProductName: item.ProductName,
                            ProductCompany: item.ProductCompany,
                            ProductWeight: item.ProductWeight,
                            ProductPrice: item.ProductPrice,
                            ProductStock: item.ProductStock,
                            UnitKg: item.UnitKg,
                            UnitPrice: item.UnitPrice,
                            Parentsuuid: headUuid
                        };
                        var newUri = "/Head(Uuid=guid'" + headUuid + "')/to_Item";
                        console.log("Creating item with URI:", newUri, "Data:", newItemData);
        
                        oMainModel.create(newUri, newItemData, {
                            success: function(itemResponse) {
                                console.log("Item saved successfully", itemResponse);
                            },
                            error: function(err) {
                                console.error("Failed to save item", err);
                                MessageBox.information("아이템 데이터를 저장하지 못했습니다.");
                            }
                        });
                    });
        
                    // 저장이 완료되면 메인 페이지로 이동합니다.
                    this.getOwnerComponent().getRouter().navTo("Main", {});
                }.bind(this),
                error: function(err) {
                    console.error("Failed to save header data", err);
                    MessageBox.information("헤더 데이터를 저장하지 못했습니다.");
                }
            });
        },        

        //주문 버튼
        onOrder: function () {
            this._openDialog();
        },

        //제품 선택 다이얼로그 (주문)
        _openDialog: function () {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment("store.view.Fragments.Dialog", this);
                this.getView().addDependent(this._oDialog);
            }

            var oProductModel = this.getOwnerComponent().getModel("pmanageData");
            this._getODataRead(oProductModel, "/Pmanage").done(
                function (aGetData) {
                    var oProductData = {
                        ProductCollection: aGetData
                    };
                    this.getView().setModel(new JSONModel(oProductData), "productModel");
                    this._oDialog.open();  // 데이터 설정 후 다이얼로그 열기
                
                }.bind(this)).fail(function () {
                    MessageBox.information("상품 조회를 할 수 없습니다.");
                });
        },

        //다이얼로그 데이터 검색 버튼 (제품명)
        handleSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("ProductName", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        //다이얼로그 select 버튼
        handleConfirm: function (oEvent) {
            var aSelectedContexts = oEvent.getParameter("selectedContexts");
            if (aSelectedContexts.length) {
                var oselectModel = this.getView().getModel("selectModel");
                if (!oselectModel) {
                    oselectModel = new JSONModel();
                    this.getView().setModel(oselectModel, "selectModel");
                }
        
                var aSelectedProducts = aSelectedContexts.map(function (oContext) {
                    var oProduct = oContext.getObject();
                    oProduct.ProductStock = 30; 
                    return oProduct;
                });
        
                oselectModel.setProperty("/items", aSelectedProducts);
        
                console.log("선택한 상품", aSelectedProducts);
            }       
            
            this._oDialog._oDialog.close();  // 다이얼로그 닫기
        },

        // 다이얼로그 cancel 버튼
        handleClose: function () {
                this._oDialog._oDialog.close();  
        },

        //선택한 상품 초기화
        clearSelectedProducts: function() {
            var oSelectModel = this.getView().getModel("selectModel");
            if (oSelectModel) {
                oSelectModel.setData({ items: [] }); 
            }
        },
        
        //뒤로가기 버튼
        onBack : function(){
            this.clearSelectedProducts();
            this.navTo("Main",{});
        },
        
        onSell: function () {
            var oTable = this.byId("productsTable");
            var aSelectedIndices = oTable.getSelectedIndices();
            var oItemModel = this.getModel("itemModel");
            var oMainModel = this.getOwnerComponent().getModel();
        
            if (aSelectedIndices.length === 0) {
                MessageBox.information("선택된 상품이 없습니다.");
                return;
            }
        
            var aPromises = [];
            var oItemData = oItemModel.getData();
        
            aSelectedIndices.forEach(function (index) {
                var oRowData = oItemData[index];
        
                // 재고를 1 감소하고 UI 업데이트
                if (oRowData.ProductStock > 0) {
                    oRowData.ProductStock -= 1;
        
                    // UI에서 판매 버튼 비활성화
                    if (oRowData.ProductStock === 0) {
                        var oButton = this.getView().byId("sellbtn");
                        oButton.setEnabled(false);
                    }
        
                    // 데이터베이스 업데이트 (PATCH)
                    var sItemPath = "/Head(guid'" + oRowData.Parentsuuid + "')/to_Item(ProductCode='" + oRowData.ProductCode + "')";
                    console.log("spath",sItemPath);
                    var oPromise = this._getODataUpdate(oMainModel, sItemPath, {
                        ProductStock: oRowData.ProductStock
                    });
        
                    aPromises.push(oPromise);
                }
            }, this);
        
            // 모든 Promise가 완료될 때까지 기다린 후 메시지 출력
            Promise.all(aPromises).then(function () {
                MessageBox.success("선택된 상품들이 판매되었습니다.");
            }).catch(function () {
                MessageBox.error("상품 판매 중 오류가 발생했습니다.");
            });
        },
        
        //무게 소수점 밑 0 제거
        formatNumber: function(value) {
            if (value !== null && value !== undefined) {
                return parseFloat(value.toString()).toString();
            }
            return value;
        }
    });
});
